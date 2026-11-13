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
    const isPlatformSuperAdmin = currentUser?.id === 1 || currentUser?.email === 'superadmin@hypn.com';
    const effectiveAdminId = isPlatformSuperAdmin ? null : (currentUser?.adminId || currentUser?.userId);
    const whereClause: any = effectiveAdminId
      ? { OR: [{ adminId: effectiveAdminId }, { adminId: null }] }
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
            { designation: { equals: d.name, mode: 'insensitive' } },
            { employee: { designation: { equals: d.name, mode: 'insensitive' } } }
          ]
        };
        if (effectiveAdminId) {
          userWhere.AND = [
            { OR: [{ adminId: effectiveAdminId }, { id: effectiveAdminId }] }
          ];
        }
        const users = await this.prisma.user.findMany({
          where: userWhere,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            employeeId: true,
            mainFacilityId: true,
            facilityId: true,
            deviceId: true,
            deviceName: true,
            mainFacility: {
              select: {
                id: true,
                mainFacilityName: true,
              }
            },
            facility: {
              select: {
                id: true,
                facilityName: true,
              }
            },
            employee: {
              select: {
                id: true,
                fullName: true,
                employeeCode: true,
                department: true,
                officialEmail: true,
              }
            }
          }
        });

        // Also check if any employee with this designation is not yet linked via user
        const empWhere: any = {
          designation: { equals: d.name, mode: 'insensitive' }
        };
        if (effectiveAdminId) {
          empWhere.adminId = effectiveAdminId;
        }
        const directEmployees = await this.prisma.employee.findMany({
          where: empWhere,
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            department: true,
            officialEmail: true,
          }
        });

        const userList = users.map(u => ({
          id: u.id,
          name: (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username) || u.employee?.fullName,
          employeeId: u.employeeId,
          employeeCode: u.employee?.employeeCode,
          email: u.email,
          username: u.username,
          mainFacilityId: u.mainFacilityId,
          facilityId: u.facilityId,
          deviceId: u.deviceId,
          deviceName: u.deviceName,
          mainFacilityName: u.mainFacility?.mainFacilityName,
          facilityName: u.facility?.facilityName,
        }));

        const existingEmpIds = new Set(users.map(u => u.employeeId).filter(Boolean));
        for (const de of directEmployees) {
          if (!existingEmpIds.has(de.id)) {
            userList.push({
              id: de.id,
              name: de.fullName,
              employeeId: de.id,
              employeeCode: de.employeeCode,
              email: de.officialEmail,
              username: de.officialEmail,
              mainFacilityId: null,
              facilityId: null,
              deviceId: null,
              deviceName: null,
              mainFacilityName: undefined,
              facilityName: undefined,
            });
          }
        }

        const assignedEmployeeIds = Array.from(new Set(userList.map(u => u.employeeId?.toString()).filter(Boolean))) as string[];

        const firstScopedUser = userList.find(u => u.deviceId || u.facilityId || u.mainFacilityId);
        const accessScope = firstScopedUser ? {
          mainFacilityId: firstScopedUser.mainFacilityId ? String(firstScopedUser.mainFacilityId) : '',
          facilityId: firstScopedUser.facilityId ? String(firstScopedUser.facilityId) : '',
          deviceId: firstScopedUser.deviceId || '',
          deviceName: firstScopedUser.deviceName || '',
          mainFacilityName: firstScopedUser.mainFacilityName || '',
          facilityName: firstScopedUser.facilityName || '',
        } : null;

        return {
          ...d,
          totalUsers: userList.length,
          users: userList,
          assignedEmployeeIds,
          accessScope,
        };
      })
    );

    return designationsWithCounts;
  }

  async findOne(idOrName: number | string, currentUser?: any) {
    const isNum = !isNaN(+idOrName);
    const isPlatformSuperAdmin = currentUser?.id === 1 || currentUser?.email === 'superadmin@hypn.com';
    const effectiveAdminId = isPlatformSuperAdmin ? null : (currentUser?.adminId || currentUser?.userId);

    const where: any = isNum
      ? { id: +idOrName }
      : { name: { equals: idOrName.toString(), mode: 'insensitive' } };

    if (effectiveAdminId) {
      where.OR = [
        { adminId: effectiveAdminId },
        { adminId: null }
      ];
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

    const userWhere: any = {
      OR: [
        { designation: { equals: designation.name, mode: 'insensitive' } },
        { employee: { designation: { equals: designation.name, mode: 'insensitive' } } }
      ]
    };
    if (effectiveAdminId) {
      userWhere.AND = [
        { OR: [{ adminId: effectiveAdminId }, { id: effectiveAdminId }] }
      ];
    }

    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        employeeId: true,
        mainFacilityId: true,
        facilityId: true,
        deviceId: true,
        deviceName: true,
        mainFacility: {
          select: {
            id: true,
            mainFacilityName: true,
          }
        },
        facility: {
          select: {
            id: true,
            facilityName: true,
          }
        },
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            department: true,
            officialEmail: true,
          }
        }
      }
    });

    const empWhere: any = {
      designation: { equals: designation.name, mode: 'insensitive' }
    };
    if (effectiveAdminId) {
      empWhere.adminId = effectiveAdminId;
    }
    const directEmployees = await this.prisma.employee.findMany({
      where: empWhere,
      select: {
        id: true,
        fullName: true,
        employeeCode: true,
        department: true,
        officialEmail: true,
      }
    });

    const userList = users.map(u => ({
      id: u.id,
      name: (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username) || u.employee?.fullName,
      employeeId: u.employeeId,
      employeeCode: u.employee?.employeeCode,
      email: u.email,
      username: u.username,
      mainFacilityId: u.mainFacilityId,
      facilityId: u.facilityId,
      deviceId: u.deviceId,
      deviceName: u.deviceName,
      mainFacilityName: u.mainFacility?.mainFacilityName,
      facilityName: u.facility?.facilityName,
    }));

    const existingEmpIds = new Set(users.map(u => u.employeeId).filter(Boolean));
    for (const de of directEmployees) {
      if (!existingEmpIds.has(de.id)) {
        userList.push({
          id: de.id,
          name: de.fullName,
          employeeId: de.id,
          employeeCode: de.employeeCode,
          email: de.officialEmail,
          username: de.officialEmail,
          mainFacilityId: null,
          facilityId: null,
          deviceId: null,
          deviceName: null,
          mainFacilityName: undefined,
          facilityName: undefined,
        });
      }
    }

    const assignedEmployeeIds = Array.from(new Set(userList.map(u => u.employeeId?.toString()).filter(Boolean))) as string[];

    const firstScopedUser = userList.find(u => u.deviceId || u.facilityId || u.mainFacilityId);
    const accessScope = firstScopedUser ? {
      mainFacilityId: firstScopedUser.mainFacilityId ? String(firstScopedUser.mainFacilityId) : '',
      facilityId: firstScopedUser.facilityId ? String(firstScopedUser.facilityId) : '',
      deviceId: firstScopedUser.deviceId || '',
      deviceName: firstScopedUser.deviceName || '',
      mainFacilityName: firstScopedUser.mainFacilityName || '',
      facilityName: firstScopedUser.facilityName || '',
    } : null;

    return {
      ...designation,
      totalUsers: userList.length,
      users: userList,
      assignedEmployeeIds,
      accessScope,
    };
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
