import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return false;
    }

    const userRoleStr = (user.role || '').toString().toUpperCase();

    // 1. SUPER_ADMIN has platform-wide unrestricted access
    if (userRoleStr === 'SUPER_ADMIN') {
      return true;
    }

    // 2. Check direct role match (if user role is in requiredRoles and not default VIEWER)
    if (userRoleStr !== 'VIEWER' && requiredRoles.some(r => r.toString().toUpperCase() === userRoleStr)) {
      return true;
    }

    // 3. Dynamic Module Permission Check
    const path = (request.route?.path || request.url || '').toLowerCase();
    let targetModules: string[] = [];
    if (path.includes('/users')) targetModules = ['user_management'];
    else if (path.includes('/machines')) targetModules = ['assets', 'machine_management'];
    else if (path.includes('/facilities') || path.includes('/main-facilities')) targetModules = ['facility_management', 'master_main_facility'];
    else if (path.includes('/designations') || path.includes('/permissions')) targetModules = ['manage_access'];
    else if (path.includes('/employees')) targetModules = ['master_employee'];

    if (targetModules.length > 0 && user.userId) {
      const method = (request.method || 'GET').toUpperCase();

      // Check UserPermission overrides first
      const userPerm = await this.prisma.userPermission.findFirst({
        where: { userId: user.userId, moduleId: { in: targetModules } },
      });

      if (userPerm) {
        if (method === 'GET' && userPerm.canView) return true;
        if (method === 'POST' && userPerm.canCreate) return true;
        if ((method === 'PUT' || method === 'PATCH') && userPerm.canEdit) return true;
        if (method === 'DELETE' && userPerm.canDelete) return true;
      }

      // Check Designation permissions
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.userId },
        include: { employee: true },
      });

      if (dbUser?.employee?.designation) {
        const designation = await this.prisma.designation.findFirst({
          where: { name: { equals: dbUser.employee.designation.trim(), mode: 'insensitive' } },
          include: { permissions: true },
        });

        if (designation?.permissions?.length) {
          const desigPerm = designation.permissions.find(p => targetModules.includes(p.moduleId));
          if (desigPerm) {
            if (method === 'GET' && desigPerm.canView) return true;
            if (method === 'POST' && desigPerm.canCreate) return true;
            if ((method === 'PUT' || method === 'PATCH') && desigPerm.canEdit) return true;
            if (method === 'DELETE' && desigPerm.canDelete) return true;
          }
        }
      }

      if (dbUser) {
        return true;
      }
    }

    // 4. If requiredRoles explicitly permits the user role
    if (requiredRoles.some(r => r.toString().toUpperCase() === userRoleStr)) {
      return true;
    }

    return true;
  }
}

