import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CodeSequenceService } from '../../../common/services/code-sequence.service';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeSequenceService: CodeSequenceService
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto, currentUser?: any) {
    if (createEmployeeDto.salaryPayout !== undefined && createEmployeeDto.salaryPayout !== null && Number(createEmployeeDto.salaryPayout) < 0) {
      throw new BadRequestException('Salary payout cannot be negative');
    }

    const officialEmail = createEmployeeDto.officialEmail?.trim();
    if (!officialEmail) {
      throw new BadRequestException('Official email is required');
    }

    const personalEmail = createEmployeeDto.personalEmail?.trim();
    if (personalEmail && officialEmail && personalEmail.toLowerCase() === officialEmail.toLowerCase()) {
      throw new BadRequestException('Personal email must be different from official email');
    }

    if (createEmployeeDto.dateOfBirth && createEmployeeDto.dateOfJoining) {
      if (!this.validateAgeDifference(createEmployeeDto.dateOfBirth, createEmployeeDto.dateOfJoining)) {
        throw new BadRequestException('Employee must be at least 18 years old on the date of joining (minimum 18 years difference between Date of Birth and Date of Joining)');
      }
    }

    const effectiveAdminId = currentUser?.adminId || currentUser?.userId || null;

    if (createEmployeeDto.officialEmail) {
      const emailWhere: any = { officialEmail: createEmployeeDto.officialEmail };
      if (effectiveAdminId) emailWhere.adminId = effectiveAdminId;

      const existingEmployee = await this.prisma.employee.findFirst({
        where: emailWhere
      });

      if (existingEmployee) {
        throw new ConflictException('Official email already exists');
      }
    }

    // Use user-provided employeeCode if present, otherwise generate next code
    let finalCode = createEmployeeDto.employeeCode?.trim();
    if (!finalCode) {
      finalCode = await this.codeSequenceService.generateNextCode('EMPLOYEE');
    } else {
      const codeWhere: any = { employeeCode: finalCode };
      if (effectiveAdminId) codeWhere.adminId = effectiveAdminId;

      const existingCode = await this.prisma.employee.findFirst({
        where: codeWhere
      });
      if (existingCode) {
        throw new ConflictException('Employee code already exists');
      }
    }

    const reportingToValue = createEmployeeDto.reportingTo && createEmployeeDto.reportingTo.trim() ? createEmployeeDto.reportingTo.trim() : null;

    return this.prisma.employee.create({
      data: {
        ...createEmployeeDto,
        employeeCode: finalCode,
        dateOfJoining: new Date(createEmployeeDto.dateOfJoining),
        dateOfBirth: new Date(createEmployeeDto.dateOfBirth),
        salaryPayout: createEmployeeDto.salaryPayout ? Number(createEmployeeDto.salaryPayout) : null,
        reportingTo: reportingToValue,
        adminId: effectiveAdminId,
      },
    });
  }

  async findAll(currentUser?: any) {
    const isPlatformSuperAdmin = currentUser?.id === 1 || currentUser?.email === 'superadmin@hypn.com';
    const effectiveAdminId = isPlatformSuperAdmin ? null : (currentUser?.adminId || currentUser?.userId);
    const whereClause: any = effectiveAdminId ? { adminId: effectiveAdminId } : {};

    const employees = await this.prisma.employee.findMany({
      where: whereClause,
      include: {
        users: {
          select: {
            id: true,
            username: true,
            role: true,
            designation: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return employees.map((emp) => {
      const user = emp.users && emp.users.length > 0 ? emp.users[0] : null;
      let role = '';
      if (user) {
        if (user.role === 'SUPER_ADMIN') {
          role = 'Admin';
        } else if (user.designation) {
          role = user.designation;
        } else if (user.role) {
          role = user.role.replace(/_/g, ' ').toLowerCase();
        }
      }
      return {
        ...emp,
        role: role || 'Staff',
        userRole: user?.role,
        userDesignation: user?.designation,
      };
    });
  }

  async findOne(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            role: true,
            designation: true,
          }
        }
      }
    });
    if (!employee) {
      throw new ConflictException('Employee not found');
    }
    const user = employee.users && employee.users.length > 0 ? employee.users[0] : null;
    let role = '';
    if (user) {
      if (user.role === 'SUPER_ADMIN') {
        role = 'Admin';
      } else if (user.designation) {
        role = user.designation;
      } else if (user.role) {
        role = user.role.replace(/_/g, ' ').toLowerCase();
      }
    }
    return {
      ...employee,
      role: role || 'Staff',
      userRole: user?.role,
      userDesignation: user?.designation,
    };
  }

  async update(id: number, updateEmployeeDto: any, currentUser?: any) {
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { id }
    });

    if (!existingEmployee) {
      throw new ConflictException('Employee not found');
    }

    if (updateEmployeeDto.officialEmail !== undefined && (!updateEmployeeDto.officialEmail || !updateEmployeeDto.officialEmail.trim())) {
      throw new BadRequestException('Official email is required');
    }

    const checkOfficial = (updateEmployeeDto.officialEmail !== undefined ? updateEmployeeDto.officialEmail : existingEmployee.officialEmail)?.trim().toLowerCase();
    const checkPersonal = (updateEmployeeDto.personalEmail !== undefined ? updateEmployeeDto.personalEmail : existingEmployee.personalEmail)?.trim().toLowerCase();

    if (checkPersonal && checkOfficial && checkPersonal === checkOfficial) {
      throw new BadRequestException('Personal email must be different from official email');
    }

    const effectiveDob = updateEmployeeDto.dateOfBirth !== undefined ? updateEmployeeDto.dateOfBirth : existingEmployee.dateOfBirth;
    const effectiveDoj = updateEmployeeDto.dateOfJoining !== undefined ? updateEmployeeDto.dateOfJoining : existingEmployee.dateOfJoining;
    if (effectiveDob && effectiveDoj) {
      if (!this.validateAgeDifference(effectiveDob, effectiveDoj)) {
        throw new BadRequestException('Employee must be at least 18 years old on the date of joining (minimum 18 years difference between Date of Birth and Date of Joining)');
      }
    }

    const effectiveAdminId = currentUser?.adminId || currentUser?.userId || existingEmployee.adminId;

    // Check for unique constraints if they are being updated
    if (updateEmployeeDto.employeeCode || updateEmployeeDto.officialEmail) {
      const duplicateWhere: any = {
        id: { not: id },
        OR: [
          ...(updateEmployeeDto.employeeCode ? [{ employeeCode: updateEmployeeDto.employeeCode }] : []),
          ...(updateEmployeeDto.officialEmail ? [{ officialEmail: updateEmployeeDto.officialEmail }] : [])
        ]
      };
      if (effectiveAdminId) {
        duplicateWhere.adminId = effectiveAdminId;
      }

      const duplicateEmployee = await this.prisma.employee.findFirst({
        where: duplicateWhere
      });

      if (duplicateEmployee) {
        if (duplicateEmployee.employeeCode === updateEmployeeDto.employeeCode) {
          throw new ConflictException('Employee code already exists');
        }
        if (duplicateEmployee.officialEmail === updateEmployeeDto.officialEmail) {
          throw new ConflictException('Official email already exists');
        }
      }
    }

    const dataToUpdate: any = { ...updateEmployeeDto };
    if (updateEmployeeDto.reportingTo !== undefined) {
      dataToUpdate.reportingTo = updateEmployeeDto.reportingTo && updateEmployeeDto.reportingTo.trim() ? updateEmployeeDto.reportingTo.trim() : null;
    }
    
    if (updateEmployeeDto.dateOfJoining) {
      dataToUpdate.dateOfJoining = new Date(updateEmployeeDto.dateOfJoining);
    }
    if (updateEmployeeDto.dateOfBirth) {
      dataToUpdate.dateOfBirth = new Date(updateEmployeeDto.dateOfBirth);
    }
    if (updateEmployeeDto.salaryPayout !== undefined && updateEmployeeDto.salaryPayout !== null) {
      if (Number(updateEmployeeDto.salaryPayout) < 0) {
        throw new BadRequestException('Salary payout cannot be negative');
      }
      dataToUpdate.salaryPayout = Number(updateEmployeeDto.salaryPayout);
    }

    return this.prisma.employee.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async getNextEmployeeCode(currentUser?: any) {
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId;
    const whereClause: any = effectiveAdminId ? { adminId: effectiveAdminId } : {};
    
    const employees = await this.prisma.employee.findMany({
      where: whereClause,
      select: { employeeCode: true }
    });

    if (!employees || employees.length === 0) {
      return { nextCode: 'EMP001' };
    }

    let maxNum = 0;
    let detectedPrefix = 'EMP';
    let detectedPadding = 3;

    for (const emp of employees) {
      if (!emp.employeeCode) continue;
      const match = emp.employeeCode.match(/^([A-Za-z0-9_-]*?)([0-9]+)$/);
      if (match) {
        const prefix = match[1] || 'EMP';
        const numStr = match[2];
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
          detectedPrefix = prefix;
          detectedPadding = Math.max(3, numStr.length);
        }
      }
    }

    const nextNum = maxNum + 1;
    const paddedNum = nextNum.toString().padStart(detectedPadding, '0');
    return { nextCode: `${detectedPrefix}${paddedNum}` };
  }

  async remove(id: number) {
    return this.prisma.employee.delete({
      where: { id },
    });
  }

  private validateAgeDifference(dobInput: string | Date, dojInput: string | Date): boolean {
    const parse = (input: string | Date): { y: number; m: number; d: number } | null => {
      if (!input) return null;
      if (typeof input === 'string') {
        const match = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match) {
          return { y: parseInt(match[1], 10), m: parseInt(match[2], 10), d: parseInt(match[3], 10) };
        }
      }
      const dt = new Date(input);
      if (isNaN(dt.getTime())) return null;
      return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
    };

    const dob = parse(dobInput);
    const doj = parse(dojInput);
    if (!dob || !doj) return true;

    let age = doj.y - dob.y;
    const monthDiff = doj.m - dob.m;
    if (monthDiff < 0 || (monthDiff === 0 && doj.d < dob.d)) {
      age--;
    }

    return age >= 18;
  }
}
