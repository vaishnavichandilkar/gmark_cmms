import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CodeSequenceService {
  constructor(private prisma: PrismaService) {}

  async previewNextCode(sequenceId: 'EMPLOYEE' | 'MAIN_FACILITY' | 'FACILITY'): Promise<string> {
    try {
      const sequence = await this.prisma.codeSequence.findUnique({
        where: { id: sequenceId },
      });
      
      if (!sequence) {
        throw new Error(`Sequence ${sequenceId} not found`);
      }

      const nextValue = sequence.lastValue + 1;
      const paddedNumber = nextValue.toString().padStart(sequence.padding, '0');
      return `${sequence.prefix}${paddedNumber}`;
    } catch (error) {
      console.error(`Error previewing sequence for ${sequenceId}:`, error);
      throw new InternalServerErrorException('Failed to preview unique code.');
    }
  }

  async generateNextCode(sequenceId: 'EMPLOYEE' | 'MAIN_FACILITY' | 'FACILITY'): Promise<string> {
    try {
      const sequence = await this.prisma.codeSequence.update({
        where: { id: sequenceId },
        data: {
          lastValue: {
            increment: 1,
          },
        },
      });

      const paddedNumber = sequence.lastValue.toString().padStart(sequence.padding, '0');
      return `${sequence.prefix}${paddedNumber}`;
    } catch (error) {
      console.error(`Error generating sequence for ${sequenceId}:`, error);
      throw new InternalServerErrorException('Failed to generate unique code.');
    }
  }
}
