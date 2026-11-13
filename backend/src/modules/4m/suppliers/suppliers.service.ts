import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async getNextSupplierCode(): Promise<{ code: string }> {
    const allSuppliers = await (this.prisma as any).supplier.findMany({
      select: { supplierCode: true },
    });
    let maxNumber = 0;
    for (const s of allSuppliers) {
      const match = s.supplierCode?.match(/SUP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    const nextNum = (maxNumber + 1).toString().padStart(3, '0');
    return { code: `SUP-${nextNum}` };
  }

  async findAll(query?: { search?: string }, currentUser?: any) {
    const { search } = query || {};
    const isPlatformSuperAdmin = currentUser?.id === 1 || currentUser?.email === 'superadmin@hypn.com';
    const effectiveAdminId = isPlatformSuperAdmin ? null : (currentUser?.adminId || currentUser?.userId);

    const whereCondition: any = search
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

    if (effectiveAdminId) {
      const adminFilter = { adminId: effectiveAdminId };
      if (whereCondition.OR) {
        whereCondition.AND = [adminFilter];
      } else {
        whereCondition.adminId = effectiveAdminId;
      }
    }

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

  async create(createSupplierDto: CreateSupplierDto, currentUser?: any) {
    let code = createSupplierDto.supplierCode?.trim();
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId || null;

    if (!code) {
      const nextObj = await this.getNextSupplierCode();
      code = nextObj.code;
    } else {
      const existing = await (this.prisma as any).supplier.findUnique({
        where: { supplierCode: code },
      });
      if (existing) {
        const nextObj = await this.getNextSupplierCode();
        code = nextObj.code;
      }
    }

    if (createSupplierDto.gstNumber && createSupplierDto.gstNumber.trim()) {
      const existingGst = await (this.prisma as any).supplier.findFirst({
        where: {
          gstNumber: createSupplierDto.gstNumber.trim().toUpperCase(),
          ...(effectiveAdminId ? { adminId: effectiveAdminId } : {}),
        },
      });
      if (existingGst) {
        throw new BadRequestException('A supplier with this GST number already exists.');
      }
    }

    try {
      return await (this.prisma as any).supplier.create({
        data: {
          ...createSupplierDto,
          gstNumber: createSupplierDto.gstNumber && createSupplierDto.gstNumber.trim() ? createSupplierDto.gstNumber.trim().toUpperCase() : null,
          supplierCode: code,
          adminId: effectiveAdminId,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        const nextObj = await this.getNextSupplierCode();
        return await (this.prisma as any).supplier.create({
          data: {
            ...createSupplierDto,
            supplierCode: nextObj.code,
            adminId: effectiveAdminId,
          },
        });
      }
      throw err;
    }
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto, currentUser?: any) {
    const existingSupplier = await this.findOne(id);
    const effectiveAdminId = currentUser?.role === 'SUPER_ADMIN' ? null : (currentUser?.adminId || currentUser?.userId || existingSupplier.adminId || null);

    if (updateSupplierDto.supplierCode) {
      const existing = await (this.prisma as any).supplier.findUnique({
        where: { supplierCode: updateSupplierDto.supplierCode },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Supplier code "${updateSupplierDto.supplierCode}" is already in use by another supplier.`,
        );
      }
    }

    if (updateSupplierDto.gstNumber && updateSupplierDto.gstNumber.trim()) {
      const existingGst = await (this.prisma as any).supplier.findFirst({
        where: {
          id: { not: id },
          gstNumber: updateSupplierDto.gstNumber.trim().toUpperCase(),
          ...(effectiveAdminId ? { adminId: effectiveAdminId } : {}),
        },
      });
      if (existingGst) {
        throw new BadRequestException('A supplier with this GST number already exists.');
      }
    }

    const dataToUpdate: any = { ...updateSupplierDto };
    if (updateSupplierDto.gstNumber !== undefined) {
      dataToUpdate.gstNumber = updateSupplierDto.gstNumber && updateSupplierDto.gstNumber.trim() ? updateSupplierDto.gstNumber.trim().toUpperCase() : null;
    }

    return (this.prisma as any).supplier.update({
      where: { id },
      data: dataToUpdate,
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

  async importSuppliers(suppliersList: CreateSupplierDto[], currentUser?: any) {
    if (!Array.isArray(suppliersList) || suppliersList.length === 0) {
      throw new BadRequestException('No suppliers data provided in CSV import');
    }

    const created = [];
    const count = await (this.prisma as any).supplier.count();
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId || null;

    for (let i = 0; i < suppliersList.length; i++) {
      const item = suppliersList[i];
      const code = item.supplierCode || `SUP-${(count + i + 1).toString().padStart(3, '0')}`;
      
      const supplier = await (this.prisma as any).supplier.create({
        data: {
          supplierCode: code,
          adminId: effectiveAdminId,
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
