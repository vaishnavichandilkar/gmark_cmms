import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const existingEmployee = await this.prisma.employee.findFirst({
      where: {
        OR: [
          { employeeCode: createEmployeeDto.employeeCode },
          { officialEmail: createEmployeeDto.officialEmail }
        ]
      }
    });

    if (existingEmployee) {
      if (existingEmployee.employeeCode === createEmployeeDto.employeeCode) {
        throw new ConflictException('Employee code already exists');
      }
      if (existingEmployee.officialEmail === createEmployeeDto.officialEmail) {
        throw new ConflictException('Official email already exists');
      }
    }

    return this.prisma.employee.create({
      data: {
        ...createEmployeeDto,
        dateOfJoining: new Date(createEmployeeDto.dateOfJoining),
        dateOfBirth: new Date(createEmployeeDto.dateOfBirth),
        salaryPayout: createEmployeeDto.salaryPayout ? Number(createEmployeeDto.salaryPayout) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.employee.findMany({
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

  async update(id: number, updateEmployeeDto: any) {
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { id }
    });

    if (!existingEmployee) {
      throw new ConflictException('Employee not found');
    }

    // Check for unique constraints if they are being updated
    if (updateEmployeeDto.employeeCode || updateEmployeeDto.officialEmail) {
      const duplicateEmployee = await this.prisma.employee.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(updateEmployeeDto.employeeCode ? [{ employeeCode: updateEmployeeDto.employeeCode }] : []),
            ...(updateEmployeeDto.officialEmail ? [{ officialEmail: updateEmployeeDto.officialEmail }] : [])
          ]
        }
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
    
    if (updateEmployeeDto.dateOfJoining) {
      dataToUpdate.dateOfJoining = new Date(updateEmployeeDto.dateOfJoining);
    }
    if (updateEmployeeDto.dateOfBirth) {
      dataToUpdate.dateOfBirth = new Date(updateEmployeeDto.dateOfBirth);
    }
    if (updateEmployeeDto.salaryPayout !== undefined) {
      dataToUpdate.salaryPayout = updateEmployeeDto.salaryPayout ? Number(updateEmployeeDto.salaryPayout) : null;
    }

    return this.prisma.employee.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async getNextEmployeeCode() {
    const lastEmployee = await this.prisma.employee.findFirst({
      orderBy: { id: 'desc' },
    });

    if (!lastEmployee || !lastEmployee.employeeCode) {
      return { nextCode: 'E001' };
    }

    const lastCode = lastEmployee.employeeCode;
    // Extract any numbers from the end of the string
    const match = lastCode.match(/(\d+)$/);
    
    if (match) {
      const numStr = match[1];
      const nextNum = parseInt(numStr, 10) + 1;
      return { nextCode: `E${nextNum.toString().padStart(3, '0')}` };
    }

  // Fallback
    return { nextCode: 'E001' };
  }

  async remove(id: number) {
    return this.prisma.employee.delete({
      where: { id },
    });
  }
}
