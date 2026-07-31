import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CodeSequenceService } from '../../common/services/code-sequence.service';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeSequenceService: CodeSequenceService
  ) {}

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
      if (existingEmployee.officialEmail === createEmployeeDto.officialEmail) {
        throw new ConflictException('Official email already exists');
      }
      // If code exists, we will just generate a new one anyway
    }

    // Generate the real unique code at insertion time
    const realEmployeeCode = await this.codeSequenceService.generateNextCode('EMPLOYEE');

    return this.prisma.employee.create({
      data: {
        ...createEmployeeDto,
        employeeCode: realEmployeeCode,
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
    const nextCode = await this.codeSequenceService.previewNextCode('EMPLOYEE');
    return { nextCode };
  }

  async remove(id: number) {
    return this.prisma.employee.delete({
      where: { id },
    });
  }
}
