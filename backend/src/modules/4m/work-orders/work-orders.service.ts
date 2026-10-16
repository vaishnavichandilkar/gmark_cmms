import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WorkOrderStatus, WorkOrderPriority } from '@prisma/client';

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateNextWONumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.workOrder.count();
    const nextSeq = (count + 1).toString().padStart(4, '0');
    return `WO-${year}-${nextSeq}`;
  }

  async createWorkOrder(dto: {
    machineId: number;
    problemDescription: string;
    priority?: WorkOrderPriority;
    triggerType?: string;
    mediaFiles?: { fileUrl: string; fileName: string; fileType: string }[];
  }, user?: any) {
    if (!dto.machineId) {
      throw new BadRequestException('Machine ID is mandatory');
    }
    if (!dto.problemDescription || dto.problemDescription.trim().length === 0) {
      throw new BadRequestException('Problem Description is mandatory');
    }

    const machine = await this.prisma.machine.findUnique({
      where: { id: Number(dto.machineId) },
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${dto.machineId} not found in database`);
    }

    const woNumber = await this.generateNextWONumber();
    const effectiveAdminId = user?.adminId || user?.userId || null;

    const workOrder = await this.prisma.workOrder.create({
      data: {
        woNumber,
        adminId: effectiveAdminId,
        machineId: Number(dto.machineId),
        problemDescription: dto.problemDescription,
        priority: dto.priority || WorkOrderPriority.MEDIUM,
        triggerType: dto.triggerType || 'MANUAL',
        status: WorkOrderStatus.PENDING_APPROVAL,
        createdById: user?.userId ? Number(user.userId) : null,
        creatorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'System User',
        creatorEmail: user?.email || 'user@gmark.com',
        media: dto.mediaFiles && dto.mediaFiles.length > 0 ? {
          create: dto.mediaFiles.map(m => ({
            fileUrl: m.fileUrl,
            fileName: m.fileName,
            fileType: m.fileType || 'IMAGE',
            uploadedStage: 'INITIAL',
            uploadedById: user?.userId ? Number(user.userId) : null,
          })),
        } : undefined,
      },
      include: {
        machine: {
          include: {
            facility: {
              include: {
                mainFacility: true,
              },
            },
            building: true,
          },
        },
        media: true,
        createdBy: true,
      },
    });

    return workOrder;
  }

  async getAllWorkOrders(query: {
    status?: string;
    tab?: string;
    machineId?: number;
    technicianId?: number;
    search?: string;
  }, user?: any) {
    const where: any = {};
    const effectiveAdminId = user?.adminId || user?.userId;

    if (effectiveAdminId) {
      where.adminId = effectiveAdminId;
    }

    if (query.machineId) {
      where.machineId = Number(query.machineId);
    }

    if (query.technicianId) {
      where.assignedTechnicianId = Number(query.technicianId);
    }

    if (query.tab) {
      switch (query.tab.toUpperCase()) {
        case 'PENDING':
        case 'PENDING_APPROVAL':
          where.status = WorkOrderStatus.PENDING_APPROVAL;
          break;
        case 'APPROVED':
        case 'IN_PROGRESS':
          where.status = { in: [WorkOrderStatus.APPROVED, WorkOrderStatus.IN_PROGRESS] };
          break;
        case 'REVISION_REQUESTED':
        case 'REVISION':
          where.status = WorkOrderStatus.REVISION_REQUESTED;
          break;
        case 'COMPLETED':
        case 'CLOSED':
          where.status = { in: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CLOSED] };
          break;
        case 'REJECTED':
          where.status = WorkOrderStatus.REJECTED;
          break;
        case 'SCHEDULED':
          where.triggerType = 'SCHEDULED';
          break;
        default:
          break;
      }
    } else if (query.status) {
      where.status = query.status as WorkOrderStatus;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { woNumber: { contains: s, mode: 'insensitive' } },
        { problemDescription: { contains: s, mode: 'insensitive' } },
        { machine: { name: { contains: s, mode: 'insensitive' } } },
        { machine: { machineCode: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const workOrders = await this.prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        machine: {
          include: {
            facility: {
              include: {
                mainFacility: true,
              },
            },
            building: true,
          },
        },
        media: true,
        assignedTechnician: true,
        createdBy: true,
        approvedBy: true,
        spareParts: true,
        revisions: true,
      },
    });

    return workOrders;
  }

  async getWorkOrderById(id: number) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id: Number(id) },
      include: {
        machine: {
          include: {
            facility: {
              include: {
                mainFacility: true,
              },
            },
            building: true,
            specifications: true,
            documents: true,
            checkpoints: true,
          },
        },
        media: true,
        assignedTechnician: true,
        createdBy: true,
        approvedBy: true,
        spareParts: true,
        revisions: {
          include: {
            requestedBy: true,
          },
        },
      },
    });

    if (!wo) {
      throw new NotFoundException(`Work Order #${id} not found`);
    }

    return wo;
  }

  async approveWorkOrder(id: number, body: {
    technicianId: number;
    estimatedStartDate?: string;
    estimatedEndDate?: string;
    remarks?: string;
  }, user?: any) {
    const wo = await this.getWorkOrderById(id);

    if (wo.status === WorkOrderStatus.REJECTED || wo.status === WorkOrderStatus.CLOSED) {
      throw new BadRequestException(`Cannot approve Work Order in status ${wo.status}`);
    }

    const updated = await this.prisma.workOrder.update({
      where: { id: Number(id) },
      data: {
        status: WorkOrderStatus.APPROVED,
        assignedTechnicianId: Number(body.technicianId),
        approvedById: user?.userId ? Number(user.userId) : null,
        estimatedStartDate: body.estimatedStartDate ? new Date(body.estimatedStartDate) : new Date(),
        estimatedEndDate: body.estimatedEndDate ? new Date(body.estimatedEndDate) : null,
        managerRemarks: body.remarks || null,
      },
      include: {
        machine: true,
        assignedTechnician: true,
        media: true,
      },
    });

    return updated;
  }

  async rejectWorkOrder(id: number, body: { rejectionReason: string }, user?: any) {
    if (!body.rejectionReason || body.rejectionReason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is mandatory when rejecting a work order');
    }

    const updated = await this.prisma.workOrder.update({
      where: { id: Number(id) },
      data: {
        status: WorkOrderStatus.REJECTED,
        rejectionReason: body.rejectionReason,
        rejectedAt: new Date(),
        rejectedById: user?.userId ? Number(user.userId) : null,
      },
      include: {
        machine: true,
        media: true,
      },
    });

    return updated;
  }

  async escalateWorkOrder(id: number, escalatedTo?: string) {
    const updated = await this.prisma.workOrder.update({
      where: { id: Number(id) },
      data: {
        isEscalated: true,
        escalatedAt: new Date(),
        escalatedTo: escalatedTo || 'Maintenance Head / Super Admin',
      },
      include: {
        machine: true,
      },
    });

    return updated;
  }

  async completeWorkOrder(id: number, body: {
    completionNotes: string;
    sparePartsUsed?: { sparePartId?: number; partName: string; partCode?: string; quantity: number; unitCost: number }[];
    proofMedia?: { fileUrl: string; fileName: string; fileType: string }[];
  }, user?: any) {
    const wo = await this.getWorkOrderById(id);

    if (wo.status !== WorkOrderStatus.APPROVED && wo.status !== WorkOrderStatus.IN_PROGRESS && wo.status !== WorkOrderStatus.REVISION_REQUESTED) {
      throw new BadRequestException(`Cannot complete Work Order currently in ${wo.status} status`);
    }

    // Save proof media if uploaded
    if (body.proofMedia && body.proofMedia.length > 0) {
      await this.prisma.workOrderMedia.createMany({
        data: body.proofMedia.map(m => ({
          workOrderId: Number(id),
          fileUrl: m.fileUrl,
          fileName: m.fileName,
          fileType: m.fileType || 'IMAGE',
          uploadedStage: 'PROOF_OF_WORK',
          uploadedById: user?.userId ? Number(user.userId) : null,
        })),
      });
    }

    // Save used spare parts
    if (body.sparePartsUsed && body.sparePartsUsed.length > 0) {
      for (const sp of body.sparePartsUsed) {
        const qty = Number(sp.quantity) || 1;
        const cost = Number(sp.unitCost) || 0;
        await this.prisma.workOrderSparePart.create({
          data: {
            workOrderId: Number(id),
            sparePartId: sp.sparePartId ? Number(sp.sparePartId) : null,
            partName: sp.partName,
            partCode: sp.partCode || null,
            quantity: qty,
            unitCost: cost,
            totalCost: qty * cost,
          },
        });
        // Deduct inventory stock if linked
        if (sp.sparePartId) {
          await this.prisma.sparePartMaster.update({
            where: { id: Number(sp.sparePartId) },
            data: { stockQuantity: { decrement: qty } },
          }).catch(() => null);
        }
      }
    }

    const updated = await this.prisma.workOrder.update({
      where: { id: Number(id) },
      data: {
        status: WorkOrderStatus.COMPLETED,
        completionNotes: body.completionNotes || 'Work Order executed and completed successfully.',
        completedAt: new Date(),
      },
      include: {
        machine: true,
        media: true,
        spareParts: true,
        assignedTechnician: true,
      },
    });

    return updated;
  }

  async closeWorkOrder(id: number, user?: any) {
    const updated = await this.prisma.workOrder.update({
      where: { id: Number(id) },
      data: {
        status: WorkOrderStatus.CLOSED,
        closedAt: new Date(),
        closedById: user?.userId ? Number(user.userId) : null,
      },
    });
    return updated;
  }

  async requestRevision(id: number, body: {
    reason: string;
    proposedEstEndDate?: string;
  }, user?: any) {
    const wo = await this.getWorkOrderById(id);

    if (!body.reason || body.reason.trim().length === 0) {
      throw new BadRequestException('Revision reason is mandatory');
    }

    const revision = await this.prisma.workOrderRevision.create({
      data: {
        workOrderId: Number(id),
        requestedById: user?.userId ? Number(user.userId) : null,
        reason: body.reason,
        previousEstEndDate: wo.estimatedEndDate,
        proposedEstEndDate: body.proposedEstEndDate ? new Date(body.proposedEstEndDate) : null,
        status: 'PENDING',
      },
    });

    const updated = await this.prisma.workOrder.update({
      where: { id: Number(id) },
      data: {
        status: WorkOrderStatus.REVISION_REQUESTED,
      },
      include: {
        revisions: true,
        machine: true,
      },
    });

    return { workOrder: updated, revision };
  }

  async reviewRevision(id: number, revisionId: number, body: { action: 'APPROVE' | 'REJECT'; remarks?: string }) {
    const rev = await this.prisma.workOrderRevision.findUnique({
      where: { id: Number(revisionId) },
    });

    if (!rev) throw new NotFoundException(`Revision #${revisionId} not found`);

    if (body.action === 'APPROVE') {
      await this.prisma.workOrderRevision.update({
        where: { id: Number(revisionId) },
        data: { status: 'APPROVED' },
      });

      const updated = await this.prisma.workOrder.update({
        where: { id: Number(id) },
        data: {
          status: WorkOrderStatus.IN_PROGRESS,
          estimatedEndDate: rev.proposedEstEndDate || undefined,
          managerRemarks: body.remarks ? `Revision Approved: ${body.remarks}` : undefined,
        },
      });

      return updated;
    } else {
      await this.prisma.workOrderRevision.update({
        where: { id: Number(revisionId) },
        data: { status: 'REJECTED' },
      });

      const updated = await this.prisma.workOrder.update({
        where: { id: Number(id) },
        data: {
          status: WorkOrderStatus.IN_PROGRESS,
        },
      });

      return updated;
    }
  }

  async checkAutoEscalation() {
    // Find WOs in PENDING_APPROVAL that were created more than 2 hours ago and not escalated
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const pendingOverdue = await this.prisma.workOrder.findMany({
      where: {
        status: WorkOrderStatus.PENDING_APPROVAL,
        isEscalated: false,
        createdAt: { lt: twoHoursAgo },
      },
    });

    for (const wo of pendingOverdue) {
      await this.escalateWorkOrder(wo.id, 'Escalated to Maintenance Head (SLA Timeout)');
    }

    return { escalatedCount: pendingOverdue.length };
  }

  async level3ApproveWorkOrder(id: number, body: { technicianId?: number; remarks?: string }, user?: any) {
    const wo = await this.getWorkOrderById(id);

    const now = new Date();
    const updated = await this.prisma.workOrder.update({
      where: { id: Number(id) },
      data: {
        status: WorkOrderStatus.APPROVED,
        breakdownLevel: 3,
        level3ApprovedAt: now,
        level3ApprovedById: user?.userId ? Number(user.userId) : null,
        assignedTechnicianId: body.technicianId ? Number(body.technicianId) : wo.assignedTechnicianId,
        managerRemarks: body.remarks ? `[Level 3 Approved] ${body.remarks}` : wo.managerRemarks,
      },
      include: {
        machine: true,
        assignedTechnician: true,
      },
    });

    return updated;
  }

  async level3RejectWorkOrder(id: number, body: { rejectionReason: string }, user?: any) {
    if (!body.rejectionReason || body.rejectionReason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is mandatory for Level 3 rejection');
    }

    const updated = await this.prisma.workOrder.update({
      where: { id: Number(id) },
      data: {
        status: WorkOrderStatus.REJECTED,
        rejectionReason: `[Level 3 Rejection] ${body.rejectionReason}`,
        rejectedAt: new Date(),
        rejectedById: user?.userId ? Number(user.userId) : null,
      },
      include: {
        machine: true,
      },
    });

    return updated;
  }

  async getHistoricalMetrics() {
    const total = await this.prisma.workOrder.count();
    const preventive = await this.prisma.workOrder.count({ where: { maintenanceCategory: 'PREVENTIVE' } });
    const predictive = await this.prisma.workOrder.count({ where: { maintenanceCategory: 'PREDICTIVE' } });
    const condition = await this.prisma.workOrder.count({ where: { maintenanceCategory: 'CONDITION' } });
    const breakdown = await this.prisma.workOrder.count({ where: { maintenanceCategory: 'BREAKDOWN' } });
    const completed = await this.prisma.workOrder.count({ where: { status: { in: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CLOSED] } } });
    const rejected = await this.prisma.workOrder.count({ where: { status: WorkOrderStatus.REJECTED } });

    return {
      total,
      byCategory: {
        preventive,
        predictive,
        condition,
        breakdown,
      },
      completed,
      rejected,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0%',
    };
  }
}
