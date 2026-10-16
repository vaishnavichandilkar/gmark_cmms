import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MachineDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDocumentsForDevice(machineId: number) {
    const machine = await this.prisma.machine.findUnique({ where: { id: machineId } });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${machineId} not found`);
    }

    return this.prisma.machineDocument.findMany({
      where: { machineId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDocument(machineId: number, data: { name: string; type: string; content: string }) {
    const machine = await this.prisma.machine.findUnique({ where: { id: machineId } });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${machineId} not found`);
    }

    return this.prisma.machineDocument.create({
      data: {
        name: data.name,
        type: data.type,
        content: data.content,
        machineId,
      },
    });
  }

  async deleteDocument(docId: number) {
    const doc = await this.prisma.machineDocument.findUnique({ where: { id: docId } });
    if (!doc) {
      throw new NotFoundException(`Document with ID ${docId} not found`);
    }

    // Delete actual file if it is a File type
    if (doc.type === 'File') {
      try {
        const filePath = path.join(process.cwd(), doc.content);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Failed to delete file:', err);
      }
    }

    return this.prisma.machineDocument.delete({
      where: { id: docId },
    });
  }

  async updateDocument(docId: number, data: { name?: string; content?: string }) {
    const doc = await this.prisma.machineDocument.findUnique({ where: { id: docId } });
    if (!doc) {
      throw new NotFoundException(`Document with ID ${docId} not found`);
    }

    return this.prisma.machineDocument.update({
      where: { id: docId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.content && { content: data.content }),
      },
    });
  }
}
