import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async getNextSupplierCode(): Promise<{ code: string }> {
    const count = await (this.prisma as any).supplier.count();
    const nextNum = (count + 1).toString().padStart(3, '0');
    return { code: `SUP-${nextNum}` };
  }

  async findAll(query?: { search?: string }) {
    const { search } = query || {};
    const whereCondition = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { supplierCode: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { state: { contains: search, mode: 'insensitive' } },
            { country: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return (this.prisma as any).supplier.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const supplier = await (this.prisma as any).supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async create(createSupplierDto: CreateSupplierDto) {
    let code = createSupplierDto.supplierCode;

    if (!code) {
      const nextObj = await this.getNextSupplierCode();
      code = nextObj.code;
    }

    return (this.prisma as any).supplier.create({
      data: {
        ...createSupplierDto,
        supplierCode: code,
      },
    });
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    await this.findOne(id);
    return (this.prisma as any).supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return (this.prisma as any).supplier.delete({
      where: { id },
    });
  }

  async bulkRemove(ids: number[], reason?: string) {
    if (!ids || !ids.length) {
      throw new BadRequestException('No supplier IDs provided for deletion');
    }

    const result = await (this.prisma as any).supplier.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return {
      success: true,
      message: `Successfully deleted ${result.count} supplier(s)`,
      count: result.count,
      reason,
    };
  }

  async importSuppliers(suppliersList: CreateSupplierDto[]) {
    if (!Array.isArray(suppliersList) || suppliersList.length === 0) {
      throw new BadRequestException('No suppliers data provided in CSV import');
    }

    const created = [];
    const count = await (this.prisma as any).supplier.count();

    for (let i = 0; i < suppliersList.length; i++) {
      const item = suppliersList[i];
      const code = item.supplierCode || `SUP-${(count + i + 1).toString().padStart(3, '0')}`;
      
      const supplier = await (this.prisma as any).supplier.create({
        data: {
          supplierCode: code,
          name: item.name || 'Unnamed Supplier',
          contactPerson: item.contactPerson || null,
          email: item.email || null,
          phone: item.phone || null,
          gstNumber: item.gstNumber || null,
          address: item.address || null,
          city: item.city || null,
          state: item.state || null,
          country: item.country || 'India',
          postalCode: item.postalCode || null,
          businessCategory: item.businessCategory || null,
          status: item.status || 'ACTIVE',
        },
      });
      created.push(supplier);
    }

    return {
      success: true,
      importedCount: created.length,
      data: created,
    };
  }
}
