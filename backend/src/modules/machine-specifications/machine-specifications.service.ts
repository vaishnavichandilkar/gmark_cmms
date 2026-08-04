import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MachineSpecificationsService {
  constructor(private prisma: PrismaService) {}

  async create(machineId: number, data: { title: string; inputType: string; data: string; unit?: string }) {
    const machine = await this.prisma.machine.findUnique({ where: { id: machineId } });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${machineId} not found`);
    }

    return this.prisma.machineSpecification.create({
      data: {
        title: data.title,
        inputType: data.inputType,
        data: data.data,
        unit: data.unit,
        machineId: machineId,
      },
    });
  }

  async findAll(machineId: number) {
    return this.prisma.machineSpecification.findMany({
      where: { machineId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(id: number) {
    const spec = await this.prisma.machineSpecification.findUnique({ where: { id } });
    if (!spec) {
      throw new NotFoundException(`Specification with ID ${id} not found`);
    }

    return this.prisma.machineSpecification.delete({
      where: { id },
    });
  }
}
