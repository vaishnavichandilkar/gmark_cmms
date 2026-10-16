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
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId;
    const whereClause: any = effectiveAdminId ? { adminId: effectiveAdminId } : {};

    return this.prisma.employee.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });
    if (!employee) {
      throw new ConflictException('Employee not found');
    }
    return employee;
  }

  async update(id: number, updateEmployeeDto: any, currentUser?: any) {
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { id }
    });

    if (!existingEmployee) {
      throw new ConflictException('Employee not found');
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
}
