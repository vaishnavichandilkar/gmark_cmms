import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  X,
  Cpu,
  Building2,
  UserCheck,
  AlertTriangle,
  Loader2,
  FileText,
  Flame,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { scheduleService } from '../../services/scheduleService';
import { workOrderService, type WorkOrder } from '../../services/workOrderService';

interface Level3ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  techniciansList?: any[];
  onSuccess?: () => void;
}

export function Level3ApprovalModal({
  isOpen,
  onClose,
  workOrder,
  techniciansList = [],
  onSuccess,
}: Level3ApprovalModalProps) {
  const [selectedTechId, setSelectedTechId] = useState<number | string>('');
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (workOrder) {
      setSelectedTechId(workOrder.assignedTechnicianId || (techniciansList.length > 0 ? techniciansList[0].id : ''));
      setRemarks('Level 3 Critical Breakdown Approved. Deploy senior technician with priority spare kit.');
      setRejectionReason('');
      setActionType('APPROVE');
    }
  }, [workOrder, techniciansList]);

  if (!isOpen || !workOrder) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await scheduleService.level3Approve(workOrder.id, {
        technicianId: selectedTechId ? Number(selectedTechId) : undefined,
        remarks: remarks.trim(),
      });

      toast.success(`Level 3 Approval granted for Work Order #${workOrder.woNumber}! Breakdown dispatched.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed Level 3 approval.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason || rejectionReason.trim().length < 5) {
      toast.error('Rejection reason is mandatory for Level 3 evaluation.');
      return;
    }

    setIsSubmitting(true);
    try {
      await scheduleService.level3Reject(workOrder.id, {
        rejectionReason: rejectionReason.trim(),
      });

      toast.error(`Work Order #${workOrder.woNumber} rejected at Level 3 review.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed Level 3 rejection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-red-950 via-slate-900 to-red-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center">
                <Flame size={22} className="text-red-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg leading-tight">Level 3 Breakdown & Approval Workflow</h3>
                  <span className="text-xs font-mono font-bold bg-red-500 text-white px-2 py-0.5 rounded">
                    Level 3 Escalation
                  </span>
                </div>
                <p className="text-xs text-red-200">Higher-Level Maintenance Executive Evaluation Panel</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Machine & Serial No Details */}
            <div className="bg-red-50/50 border border-red-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-red-200 flex items-center justify-center text-red-600 font-bold">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{workOrder.machine?.name}</h4>
                    <span className="text-xs text-gray-500 font-mono">
                      Code: {workOrder.machine?.machineCode || `MCH-${workOrder.machineId}`} | Serial No: {workOrder.machine?.serialNumber || 'SN-8829-09'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold bg-red-600 text-white px-2.5 py-1 rounded-full uppercase">
                  Critical Breakdown
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-red-200 text-xs">
                <span className="text-red-700 font-bold block uppercase text-[10px]">REPORTED BREAKDOWN PROBLEM</span>
                <p className="text-gray-900 font-semibold mt-1">{workOrder.problemDescription}</p>
              </div>
            </div>

            {/* Level 3 Approval / Rejection Tabs */}
            <div className="space-y-4">
              <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setActionType('APPROVE')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  Level 3 Approve & Assign
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('REJECT')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    actionType === 'REJECT'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <XCircle size={16} />
                  Level 3 Reject
                </button>
              </div>

              {actionType === 'APPROVE' && (
                <div className="space-y-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 block">Assigned Lead Technician</label>
                    <select
                      value={selectedTechId}
                      onChange={e => setSelectedTechId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                    >
                      <option value="">-- Select Senior Technician --</option>
                      {techniciansList.map((t: any) => {
                        const name = t.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : t.username;
                        const isAdmin = t.role === 'SUPER_ADMIN' || t.role === 'SOCIETY_ADMIN';
                        const label = isAdmin ? `${name} (Admin)` : name;
                        return (
                          <option key={t.id} value={t.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 block">Level 3 Executive Remarks</label>
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium outline-none"
                    />
                  </div>

                  <button
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Confirm Level 3 Approval
                  </button>
                </div>
              )}

              {actionType === 'REJECT' && (
                <div className="space-y-4 bg-red-50/50 border border-red-200 rounded-2xl p-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-red-800 block">
                      Mandatory Rejection Rationale <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder="State reason for Level 3 rejection..."
                      className="w-full p-3 bg-white border border-red-300 rounded-xl text-xs font-medium text-gray-800 outline-none"
                    />
                  </div>

                  <button
                    onClick={handleReject}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                    Confirm Level 3 Rejection
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
