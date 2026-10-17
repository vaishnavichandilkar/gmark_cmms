import { api } from '../lib/api';

export interface MaintenanceScheduleTask {
  id?: number;
  description: string;
  taskType?: string;
  frequency?: string;
  assignedTechnicianId?: number;
  assignedTechnician?: any;
  checkpointMasterId?: number;
  checkpointMaster?: any;
  standardValue?: string;
  toleranceMin?: number;
  toleranceMax?: number;
}

export interface MaintenanceScheduleSpare {
  id?: number;
  sparePartId?: number;
  sparePart?: any;
  partName: string;
  partCode?: string;
  quantity: number;
}

export interface MaintenanceSchedule {
  id: number;
  scheduleCode: string;
  scheduleType: 'PREVENTIVE' | 'PREDICTIVE' | 'CONDITION' | 'BREAKDOWN';
  frequency: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  machineId: number;
  machine: any;
  mainFacilityId?: number;
  facilityId?: number;
  buildingId?: number;
  prePlanToleranceDays: number;
  postPlanToleranceDays: number;
  triggerTime: string;
  startDate: string;
  endDate?: string;
  nextRunDate?: string;
  lastRunDate?: string;
  completedBy?: string;
  notes?: string;
  notifyUsers?: string;
  tasks?: MaintenanceScheduleTask[];
  spares?: MaintenanceScheduleSpare[];
  logs?: any[];
  createdAt: string;
  updatedAt: string;
}

export const scheduleService = {
  async getSchedules(params?: { type?: string; search?: string; machineId?: number }) {
    try {
      const response = await api.get('/schedules', { params });
      return response.data;
    } catch (err: any) {
      return [];
    }
  },

  async getScheduleById(id: number) {
    const response = await api.get(`/schedules/${id}`);
    return response.data;
  },

  async createSchedule(data: any) {
    const response = await api.post('/schedules', data);
    return response.data;
  },

  async updateSchedule(id: number, data: any) {
    const response = await api.put(`/schedules/${id}`, data);
    return response.data;
  },

  async deleteSchedule(id: number) {
    const response = await api.delete(`/schedules/${id}`);
    return response.data;
  },

  async triggerScheduleWO(id: number) {
    const response = await api.post(`/schedules/${id}/trigger-wo`);
    return response.data;
  },

  // Checkpoint Master & Dual Database APIs
  async getMasterCheckpoints(search?: string, type?: string) {
    try {
      const response = await api.get('/checkpoints/master', { params: { search, type } });
      return response.data;
    } catch (err: any) {
      return [];
    }
  },

  async createCheckpointDualDB(data: {
    machineId: number;
    checkpointType: string;
    description: string;
    frequency: string;
    standardValue?: string;
    minValue?: number;
    maxValue?: number;
    unit?: string;
    category?: string;
  }) {
    const response = await api.post('/checkpoints', data);
    return response.data;
  },

  async getUserCheckpointsByMachine(machineId: number) {
    try {
      const response = await api.get(`/checkpoints/machine/${machineId}`);
      return response.data;
    } catch (err: any) {
      return [];
    }
  },

  // Level 3 Approval Workflow APIs
  async level3Approve(id: number, data: { technicianId?: number; remarks?: string }) {
    const response = await api.post(`/work-orders/${id}/level3-approve`, data);
    return response.data;
  },

  async level3Reject(id: number, data: { rejectionReason: string }) {
    const response = await api.post(`/work-orders/${id}/level3-reject`, data);
    return response.data;
  },

  async getHistoricalMetrics() {
    try {
      const response = await api.get('/work-orders/metrics/historical');
      return response.data;
    } catch (err: any) {
      return null;
    }
  },
};
