import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';

@Injectable()
export class DesignationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDesignationDto: CreateDesignationDto, currentUser?: any) {
    const { name, isActive, permissions } = createDesignationDto;
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId || null;
    return this.prisma.designation.create({
      data: {
        name,
        isActive,
        adminId: effectiveAdminId,
        permissions: {
          create: permissions,
        },
      },
      include: {
        permissions: true,
      },
    });
  }

  async findAll(currentUser?: any) {
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId;
    const whereClause: any = effectiveAdminId
      ? { adminId: effectiveAdminId }
      : {};

    const designations = await this.prisma.designation.findMany({
      where: whereClause,
      include: {
        permissions: true,
      },
      orderBy: { id: 'asc' },
    });
    
    const designationsWithCounts = await Promise.all(
      designations.map(async (d) => {
        const userWhere: any = {
          OR: [
            { designation: d.name },
            { employee: { designation: d.name } }
          ]
        };
        if (effectiveAdminId) {
          userWhere.AND = [
            { OR: [{ adminId: effectiveAdminId }, { id: effectiveAdminId }] }
          ];
        }
        const totalUsers = await this.prisma.user.count({
          where: userWhere,
        });
        return {
          ...d,
          totalUsers,
        };
      })
    );

    return designationsWithCounts;
  }

  async findOne(idOrName: number | string, currentUser?: any) {
    const isNum = !isNaN(+idOrName);
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId;

    const where: any = isNum
      ? { id: +idOrName }
      : { name: { equals: idOrName.toString(), mode: 'insensitive' } };

    if (effectiveAdminId) {
      where.adminId = effectiveAdminId;
    }

    const designation = await this.prisma.designation.findFirst({
      where,
      include: {
        permissions: true,
      },
    });

    if (!designation) {
      throw new NotFoundException(`Designation with ID or Name "${idOrName}" not found`);
    }

    return designation;
  }

  async update(id: number, updateDesignationDto: UpdateDesignationDto, currentUser?: any) {
    const { name, isActive, permissions } = updateDesignationDto;

    // We will update name/isActive, and completely recreate the permissions
    return this.prisma.$transaction(async (prisma) => {
      if (permissions) {
        await prisma.permission.deleteMany({
          where: { designationId: id },
        });
      }

      return prisma.designation.update({
        where: { id },
        data: {
          name,
          isActive,
          ...(permissions && {
            permissions: {
              create: permissions,
            },
          }),
        },
        include: {
          permissions: true,
        },
      });
    });
  }

  async remove(id: number, currentUser?: any) {
    try {
      await this.prisma.designation.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      throw new NotFoundException(`Designation with ID ${id} not found or could not be deleted`);
    }
  }
}
