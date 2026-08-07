import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: number,
    action: string,
    module: string,
    ipAddress: string,
  ) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          module,
          ipAddress: ipAddress || '127.0.0.1',
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  async findAll() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
