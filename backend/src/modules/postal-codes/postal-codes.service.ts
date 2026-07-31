import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PostalCodesService {
  constructor(private prisma: PrismaService) {}

  async findByPincode(pincode: string) {
    const postalCode = await this.prisma.postalCode.findUnique({
      where: { pincode },
    });

    if (!postalCode) {
      throw new NotFoundException(`Postal code ${pincode} not found`);
    }

    return postalCode;
  }
}
