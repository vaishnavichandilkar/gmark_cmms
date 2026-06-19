import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SocietiesService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return this.prisma.society.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const society = await this.prisma.society.findUnique({
      where: { id },
    });
    if (!society) {
      throw new NotFoundException(`Society with ID ${id} not found`);
    }
    return society;
  }

  async create(data: { name: string; city: string }) {
    return this.prisma.society.create({
      data,
    });
  }

  async update(id: number, data: { name: string; city: string }) {
    await this.findOne(id);
    return this.prisma.society.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.society.delete({
      where: { id },
    });
  }
}
