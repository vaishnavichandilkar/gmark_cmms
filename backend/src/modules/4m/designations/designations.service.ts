import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';

@Injectable()
export class DesignationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDesignationDto: CreateDesignationDto) {
    const { name, isActive, permissions } = createDesignationDto;
    return this.prisma.designation.create({
      data: {
        name,
        isActive,
        permissions: {
          create: permissions,
        },
      },
      include: {
        permissions: true,
      },
    });
  }

  async findAll() {
    const designations = await this.prisma.designation.findMany({
      include: {
        permissions: true,
      },
      orderBy: { id: 'asc' },
    });
    
    const designationsWithCounts = await Promise.all(
      designations.map(async (d) => {
        const totalUsers = await this.prisma.user.count({
          where: {
            employee: {
              designation: d.name
            }
          }
        });
        return {
          ...d,
          totalUsers,
        };
      })
    );

    return designationsWithCounts;
  }

  async findOne(id: number) {
    const designation = await this.prisma.designation.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });

    if (!designation) {
      throw new NotFoundException(`Designation with ID ${id} not found`);
    }

    return designation;
  }

  async update(id: number, updateDesignationDto: UpdateDesignationDto) {
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

  async remove(id: number) {
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
