import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class SparePartsService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeSpareData(data: any) {
    const sanitized: any = {};

    if (data.partCode) sanitized.partCode = String(data.partCode).trim();
    if (data.partName) sanitized.partName = String(data.partName).trim();
    if (data.category !== undefined) sanitized.category = data.category ? String(data.category) : null;
    if (data.subCategory !== undefined) sanitized.subCategory = data.subCategory ? String(data.subCategory) : null;

    if (data.stockQuantity !== undefined) sanitized.stockQuantity = Math.round(Number(data.stockQuantity)) || 0;
    if (data.inHandQuantity !== undefined) sanitized.inHandQuantity = Math.round(Number(data.inHandQuantity)) || 0;
    if (data.atSourceQuantity !== undefined) sanitized.atSourceQuantity = Math.round(Number(data.atSourceQuantity)) || 0;
    if (data.minimumQuantity !== undefined) sanitized.minimumQuantity = Math.round(Number(data.minimumQuantity)) || 0;
    if (data.totalStock !== undefined) sanitized.totalStock = Math.round(Number(data.totalStock)) || 0;

    if (data.unitOfMeasure !== undefined) sanitized.unitOfMeasure = data.unitOfMeasure ? String(data.unitOfMeasure) : 'PCS';
    if (data.unitCost !== undefined) sanitized.unitCost = Number(data.unitCost) || 0;
    if (data.rate !== undefined) sanitized.rate = Number(data.rate) || 0;

    if (data.location !== undefined) sanitized.location = data.location ? String(data.location) : null;
    if (data.stockLocation !== undefined) sanitized.stockLocation = data.stockLocation ? String(data.stockLocation) : null;
    if (data.description !== undefined) sanitized.description = data.description ? String(data.description) : null;
    if (data.headOfDepartment !== undefined) sanitized.headOfDepartment = data.headOfDepartment ? String(data.headOfDepartment) : null;
    if (data.notes !== undefined) sanitized.notes = data.notes ? String(data.notes) : null;
    if (data.imageUrl !== undefined) sanitized.imageUrl = data.imageUrl ? String(data.imageUrl) : null;
    if (data.namePlateFile !== undefined) sanitized.namePlateFile = data.namePlateFile ? String(data.namePlateFile) : null;

    if (data.stockLocations !== undefined) sanitized.stockLocations = data.stockLocations;
    if (data.machinesList !== undefined) sanitized.machinesList = data.machinesList;
    if (data.customSpecifications !== undefined) sanitized.customSpecifications = data.customSpecifications;
    if (data.warrantiesList !== undefined) sanitized.warrantiesList = data.warrantiesList;
    if (data.suppliersList !== undefined) sanitized.suppliersList = data.suppliersList;
    if (data.documentsList !== undefined) sanitized.documentsList = data.documentsList;
    if (data.logsList !== undefined) sanitized.logsList = data.logsList;

    return sanitized;
  }

  async getAllSpareParts(currentUser?: any) {
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const effectiveAdminId = isSuperAdmin ? null : (currentUser?.adminId || currentUser?.userId);
    const where: any = effectiveAdminId
      ? { OR: [{ adminId: effectiveAdminId }, { adminId: null }] }
      : {};

    return this.prisma.sparePartMaster.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSparePartById(id: number) {
    return this.prisma.sparePartMaster.findUnique({ where: { id } });
  }

  async createSparePart(data: any, currentUser?: any) {
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId || null;
    const sanitized = this.sanitizeSpareData(data);

    if (!sanitized.partCode) {
      sanitized.partCode = `SP-${Math.floor(10000 + Math.random() * 90000)}`;
    }
    if (!sanitized.partName) {
      sanitized.partName = 'Spare Part';
    }

    return this.prisma.sparePartMaster.create({
      data: {
        ...sanitized,
        adminId: effectiveAdminId,
      },
    });
  }

  async updateSparePart(id: number, data: any) {
    const sanitized = this.sanitizeSpareData(data);
    return this.prisma.sparePartMaster.update({
      where: { id },
      data: sanitized,
    });
  }

  async deleteSparePart(id: number) {
    return this.prisma.sparePartMaster.delete({
      where: { id },
    });
  }
}

