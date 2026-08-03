import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MachineSpecificationsService {
  constructor(private prisma: PrismaService) {}

  async create(deviceId: number, data: { title: string; inputType: string; data: string; unit?: string }) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    return this.prisma.machineSpecification.create({
      data: {
        title: data.title,
        inputType: data.inputType,
        data: data.data,
        unit: data.unit,
        deviceId: deviceId,
      },
    });
  }

  async findAll(deviceId: number) {
    return this.prisma.machineSpecification.findMany({
      where: { deviceId },
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
