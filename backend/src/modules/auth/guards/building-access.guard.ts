import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class BuildingAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    // SUPER_ADMIN has unrestricted global access
    if (user.role === 'SUPER_ADMIN') return true;

    const params = request.params;
    const path = request.route?.path || '';

    let buildingId: number | null = null;

    // 1. If route specifies buildingId directly
    if (path.includes('/buildings') && (params.buildingId || params.id)) {
      const rawBuildingId = params.buildingId || params.id;
      buildingId = parseInt(rawBuildingId, 10);
    } 
    // 2. If route specifies device details
    else if (path.includes('/devices')) {
      const rawDeviceId = params.id || params.deviceId;
      if (rawDeviceId) {
        // If it's a numeric database ID
        const parsedId = parseInt(rawDeviceId, 10);
        let device = null;
        if (!isNaN(parsedId)) {
          device = await this.prisma.device.findUnique({
            where: { id: parsedId },
          });
        }
        
        // Try deviceId string if not found by ID
        if (!device) {
          device = await this.prisma.device.findUnique({
            where: { deviceId: rawDeviceId },
          });
        }

        if (device) {
          buildingId = device.buildingId;
        }
      }
    }

    // Verification
    if (buildingId !== null && !isNaN(buildingId)) {
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
      });

      if (!building) {
        return true; // Let controller handle 404
      }

      // Check society isolation
      if (user.societyId && building.societyId !== user.societyId) {
        throw new ForbiddenException('Access denied: building does not belong to your society');
      }

      // Check building-level assignment (SOCIETY_ADMIN is unrestricted within their society)
      if (user.role !== 'SOCIETY_ADMIN') {
        const hasAccess = user.buildingIds?.includes(buildingId);
        if (!hasAccess) {
          throw new ForbiddenException('Access denied: you are not assigned to this building');
        }
      }
    }

    return true;
  }
}
