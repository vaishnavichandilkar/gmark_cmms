import { api } from '../lib/api';

export interface WorkOrderMedia {
  id?: number;
  fileUrl: string;
  fileName: string;
  fileType: string;
  uploadedStage?: string;
  createdAt?: string;
}

export interface WorkOrderSparePart {
  id?: number;
  sparePartId?: number;
  partName: string;
  partCode?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface WorkOrderRevision {
  id: number;
  workOrderId: number;
  reason: string;
  previousEstEndDate?: string;
  proposedEstEndDate?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy?: any;
  createdAt: string;
}

export interface WorkOrder {
  id: number;
  woNumber: string;
  machineId: number;
  machine: any;
  problemDescription: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'REVISION_REQUESTED' | 'COMPLETED' | 'CLOSED' | 'REJECTED';
  triggerType: string;
  createdById?: number;
  creatorName?: string;
  creatorEmail?: string;
  assignedTechnicianId?: number;
  assignedTechnician?: any;
  approvedById?: number;
  approvedBy?: any;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  managerRemarks?: string;
  isEscalated?: boolean;
  escalatedAt?: string;
  escalatedTo?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  completionNotes?: string;
  completedAt?: string;
  closedAt?: string;
  media?: WorkOrderMedia[];
  spareParts?: WorkOrderSparePart[];
  revisions?: WorkOrderRevision[];
  createdAt: string;
  updatedAt: string;
}

export const workOrderService = {
  // Public Machine endpoints (No Auth needed)
  async lookupPublicMachine(codeOrId: string) {
    try {
      const response = await api.get(`/public/machines/lookup/${encodeURIComponent(codeOrId)}`);
      return response.data;
    } catch (err: any) {
      // Fallback for demo mode if backend server is not running or offline
      return null;
    }
  },

  async getPublicMachineCheckpoints(machineId: number) {
    try {
      const response = await api.get(`/public/machines/${machineId}/checkpoints`);
      return response.data;
    } catch (err: any) {
      return [];
    }
  },

  // Authenticated Work Order Endpoints
  async getWorkOrders(params?: { tab?: string; status?: string; search?: string; machineId?: number; technicianId?: number }) {
    try {
      const response = await api.get('/work-orders', { params });
      return response.data;
    } catch (err: any) {
      return [];
    }
  },

  async getWorkOrderById(id: number) {
    const response = await api.get(`/work-orders/${id}`);
    return response.data;
  },

  async createWorkOrder(data: {
    machineId: number;
    problemDescription: string;
    priority?: string;
    triggerType?: string;
    assignedTechnicianId?: number | null;
    mediaFiles?: { fileUrl: string; fileName: string; fileType: string }[];
  }) {
    const response = await api.post('/work-orders', data);
    return response.data;
  },

  async assignTechnician(id: number, technicianId: number | null) {
    const response = await api.post(`/work-orders/${id}/assign`, { technicianId });
    return response.data;
  },

  async approveWorkOrder(id: number, data: {
    technicianId: number;
    estimatedStartDate?: string;
    estimatedEndDate?: string;
    remarks?: string;
  }) {
    const response = await api.post(`/work-orders/${id}/approve`, data);
    return response.data;
  },

  async rejectWorkOrder(id: number, data: { rejectionReason: string }) {
    const response = await api.post(`/work-orders/${id}/reject`, data);
    return response.data;
  },

  async escalateWorkOrder(id: number, data?: { escalatedTo?: string }) {
    const response = await api.post(`/work-orders/${id}/escalate`, data);
    return response.data;
  },

  async completeWorkOrder(id: number, data: {
    completionNotes: string;
    sparePartsUsed?: { sparePartId?: number; partName: string; partCode?: string; quantity: number; unitCost: number }[];
    proofMedia?: { fileUrl: string; fileName: string; fileType: string }[];
  }) {
    const response = await api.post(`/work-orders/${id}/complete`, data);
    return response.data;
  },

  async closeWorkOrder(id: number) {
    const response = await api.post(`/work-orders/${id}/close`);
    return response.data;
  },

  async requestRevision(id: number, data: { reason: string; proposedEstEndDate?: string }) {
    const response = await api.post(`/work-orders/${id}/request-revision`, data);
    return response.data;
  },

  async reviewRevision(id: number, revisionId: number, data: { action: 'APPROVE' | 'REJECT'; remarks?: string }) {
    const response = await api.post(`/work-orders/${id}/revisions/${revisionId}/review`, data);
    return response.data;
  },

  async uploadMediaFiles(files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const response = await api.post('/work-orders/upload-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getSparePartsCatalog() {
    try {
      const response = await api.get('/spare-parts');
      return response.data;
    } catch (err: any) {
      return [];
    }
  },

  async getTechniciansList() {
    try {
      const response = await api.get('/users');
      // Filter out Super Admin - system administrators should not be assigned as field technicians/operators
      const users = Array.isArray(response.data) ? response.data : [];
      return users.filter((u: any) => 
        u.role !== 'SUPER_ADMIN' && 
        u.username?.toLowerCase() !== 'admin' &&
        u.firstName?.toLowerCase() !== 'super admin'
      );
    } catch (err: any) {
      return [];
    }
  },
};
