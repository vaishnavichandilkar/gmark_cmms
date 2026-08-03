import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MachineDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDocumentsForDevice(deviceId: number) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    return this.prisma.machineDocument.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDocument(deviceId: number, data: { name: string; type: string; content: string }) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    return this.prisma.machineDocument.create({
      data: {
        name: data.name,
        type: data.type,
        content: data.content,
        deviceId,
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
}
