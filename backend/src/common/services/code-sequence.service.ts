import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CodeSequenceService {
  constructor(private prisma: PrismaService) {}

  async previewNextCode(sequenceId: 'EMPLOYEE' | 'MAIN_FACILITY' | 'FACILITY' | 'ASSET' | 'MACHINE'): Promise<string> {
    try {
      let sequence = await this.prisma.codeSequence.findUnique({
        where: { id: sequenceId },
      });
      
      if (!sequence) {
        let initialMax = 0;
        if (sequenceId === 'ASSET') {
          const astMachines = await this.prisma.machine.findMany({
            where: { assetCode: { startsWith: 'AST' } },
            select: { assetCode: true },
          });
          for (const m of astMachines) {
            if (m.assetCode) {
              const num = parseInt(m.assetCode.replace(/^\D+/, ''), 10);
              if (!isNaN(num) && num > initialMax) {
                initialMax = num;
              }
            }
          }
        } else if (sequenceId === 'MACHINE') {
          const mchMachines = await this.prisma.machine.findMany({
            where: { machineCode: { startsWith: 'MCH' } },
            select: { machineCode: true },
          });
          for (const m of mchMachines) {
            if (m.machineCode) {
              const num = parseInt(m.machineCode.replace(/^\D+/, ''), 10);
              if (!isNaN(num) && num > initialMax) {
                initialMax = num;
              }
            }
          }
        }

        // Auto-create sequence if it doesn't exist
        sequence = await this.prisma.codeSequence.create({
          data: {
            id: sequenceId,
            prefix: sequenceId === 'EMPLOYEE' ? 'EMP' : sequenceId === 'MAIN_FACILITY' ? 'MF' : sequenceId === 'FACILITY' ? 'FL' : sequenceId === 'MACHINE' ? 'MCH' : 'AST',
            lastValue: initialMax,
            padding: 3
          }
        });
      }

      const nextValue = sequence.lastValue + 1;
      const paddedNumber = nextValue.toString().padStart(sequence.padding, '0');
      return `${sequence.prefix}${paddedNumber}`;
    } catch (error) {
      console.error(`Error previewing sequence for ${sequenceId}:`, error);
      throw new InternalServerErrorException('Failed to preview unique code.');
    }
  }

  async generateNextCode(sequenceId: 'EMPLOYEE' | 'MAIN_FACILITY' | 'FACILITY' | 'ASSET' | 'MACHINE'): Promise<string> {
    try {
      let sequence = await this.prisma.codeSequence.findUnique({
        where: { id: sequenceId }
      });

      if (!sequence) {
        let initialMax = 0;
        if (sequenceId === 'ASSET') {
          const astMachines = await this.prisma.machine.findMany({
            where: { assetCode: { startsWith: 'AST' } },
            select: { assetCode: true },
          });
          for (const m of astMachines) {
            if (m.assetCode) {
              const num = parseInt(m.assetCode.replace(/^\D+/, ''), 10);
              if (!isNaN(num) && num > initialMax) {
                initialMax = num;
              }
            }
          }
        } else if (sequenceId === 'MACHINE') {
          const mchMachines = await this.prisma.machine.findMany({
            where: { machineCode: { startsWith: 'MCH' } },
            select: { machineCode: true },
          });
          for (const m of mchMachines) {
            if (m.machineCode) {
              const num = parseInt(m.machineCode.replace(/^\D+/, ''), 10);
              if (!isNaN(num) && num > initialMax) {
                initialMax = num;
              }
            }
          }
        }

        sequence = await this.prisma.codeSequence.create({
          data: {
            id: sequenceId,
            prefix: sequenceId === 'EMPLOYEE' ? 'EMP' : sequenceId === 'MAIN_FACILITY' ? 'MF' : sequenceId === 'FACILITY' ? 'FL' : sequenceId === 'MACHINE' ? 'MCH' : 'AST',
            lastValue: initialMax,
            padding: 3
          }
        });
      }

      const updatedSequence = await this.prisma.codeSequence.update({
        where: { id: sequenceId },
        data: {
          lastValue: {
            increment: 1,
          },
        },
      });

      const paddedNumber = updatedSequence.lastValue.toString().padStart(updatedSequence.padding, '0');
      return `${updatedSequence.prefix}${paddedNumber}`;
    } catch (error) {
      console.error(`Error generating sequence for ${sequenceId}:`, error);
      throw new InternalServerErrorException('Failed to generate unique code.');
    }
  }
}
