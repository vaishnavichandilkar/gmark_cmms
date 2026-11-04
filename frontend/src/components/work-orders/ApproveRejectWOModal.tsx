import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  Calendar,
  FileText,
  X,
  ShieldAlert,
  Loader2,
  Cpu,
  Building2,
  Eye,
  Film,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { workOrderService, type WorkOrder } from '../../services/workOrderService';
import { CustomDatePicker } from '../shared/CustomDatePicker';

interface ApproveRejectWOModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  techniciansList?: any[];
  onSuccess?: () => void;
}

export function ApproveRejectWOModal({
  isOpen,
  onClose,
  workOrder,
  techniciansList = [],
  onSuccess,
}: ApproveRejectWOModalProps) {
  const [activeAction, setActiveAction] = useState<'APPROVE' | 'REJECT' | 'ESCALATE'>('APPROVE');

  // Approve fields
  const [selectedTechId, setSelectedTechId] = useState<number | string>('');
  const [estStartDate, setEstStartDate] = useState('');
  const [estEndDate, setEstEndDate] = useState('');
  const [managerRemarks, setManagerRemarks] = useState('');

  // Reject fields
  const [rejectionReason, setRejectionReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingMediaUrl, setViewingMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (workOrder) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      setEstStartDate(new Date().toISOString().split('T')[0]);
      setEstEndDate(tomorrow.toISOString().split('T')[0]);
      setSelectedTechId(workOrder.assignedTechnicianId || (techniciansList.length > 0 ? techniciansList[0].id : ''));
      setRejectionReason('');
      setManagerRemarks('');
      setActiveAction('APPROVE');
    }
  }, [workOrder, techniciansList]);

  if (!isOpen || !workOrder) return null;

  const handleApproveSubmit = async () => {
    if (!selectedTechId) {
      toast.error('Please select an assigned technician from the dropdown.');
      return;
    }

    setIsSubmitting(true);
    try {
      await workOrderService.approveWorkOrder(workOrder.id, {
        technicianId: Number(selectedTechId),
        estimatedStartDate: estStartDate,
        estimatedEndDate: estEndDate,
        remarks: managerRemarks,
      });

      toast.success(`Work Order #${workOrder.woNumber} approved & assigned successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve Work Order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason || rejectionReason.trim().length < 5) {
      toast.error('Rejection reason is mandatory (min 5 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      await workOrderService.rejectWorkOrder(workOrder.id, {
        rejectionReason: rejectionReason.trim(),
      });

      toast.error(`Work Order #${workOrder.woNumber} rejected. Moved to Rejected WO Database.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject Work Order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalateSubmit = async () => {
    setIsSubmitting(true);
    try {
      await workOrderService.escalateWorkOrder(workOrder.id, {
        escalatedTo: 'Maintenance Head & Plant Manager',
      });

      toast.success(`Work Order #${workOrder.woNumber} escalated to Maintenance Head! Notification dispatched.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to escalate Work Order.');
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
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <ShieldAlert size={22} className="text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg leading-tight">Work Order Approval Review</h3>
                  <span className="text-xs font-mono font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded">
                    {workOrder.woNumber}
                  </span>
                </div>
                <p className="text-xs text-gray-400">Maintenance Manager Evaluation & Assignment Panel</p>
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
            {/* Machine & Problem Overview */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-emerald-600 font-bold">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{workOrder.machine?.name || 'Hydraulic Pump'}</h4>
                    <span className="text-xs text-gray-500 font-mono">
                      Code: {workOrder.machine?.machineCode || `MCH-${workOrder.machineId}`} | Make: {workOrder.machine?.make || 'Grundfos'}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    workOrder.priority === 'CRITICAL'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : workOrder.priority === 'HIGH'
                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {workOrder.priority} Priority
                </span>
              </div>

              {/* Problem Description */}
              <div className="bg-white p-3 rounded-xl border border-gray-200 text-xs">
                <span className="text-gray-400 font-bold block uppercase text-[10px]">PROBLEM STATEMENT</span>
                <p className="text-gray-800 font-medium mt-1 whitespace-pre-wrap">{workOrder.problemDescription}</p>
              </div>

              {/* Attached Media Thumbnails */}
              {workOrder.media && workOrder.media.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-gray-400 font-bold block uppercase text-[10px]">ATTACHED MEDIA PROOF</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {workOrder.media.map((m, idx) => (
                      <div
                        key={idx}
                        onClick={() => setViewingMediaUrl(m.fileUrl)}
                        className="w-20 h-16 bg-gray-200 rounded-lg overflow-hidden border border-gray-300 relative group shrink-0 cursor-pointer"
                      >
                        {m.fileType === 'VIDEO' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
                            <Film size={20} />
                            <span className="text-[9px]">Video</span>
                          </div>
                        ) : (
                          <img src={m.fileUrl} alt={m.fileName} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye size={16} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SLA Timer / Escalation Status Badge */}
            {workOrder.isEscalated && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-800 flex items-center justify-between font-medium">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-600" />
                  <span>
                    <strong>Escalated Work Order:</strong> Automatically escalated on {new Date(workOrder.escalatedAt || '').toLocaleString()} to {workOrder.escalatedTo || 'Maintenance Head'}.
                  </span>
                </div>
              </div>
            )}

            {/* Action Tabs: Approve & Assign vs Reject vs Escalate */}
            <div className="space-y-4">
              <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveAction('APPROVE')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeAction === 'APPROVE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  Approve & Assign
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction('REJECT')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeAction === 'REJECT'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <XCircle size={16} />
                  Reject WO
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction('ESCALATE')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeAction === 'ESCALATE'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ArrowUpRight size={16} />
                  Escalate
                </button>
              </div>

              {/* Form Body Based on Selected Tab */}
              {activeAction === 'APPROVE' && (
                <div className="space-y-4 bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 block">
                      Assign Technician / Operator <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedTechId}
                      onChange={e => setSelectedTechId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Select Technician from Database --</option>
                      {techniciansList.length > 0 ? (
                        techniciansList.map((t: any) => {
                          const name = t.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : t.username;
                          const isAdmin = t.role === 'SUPER_ADMIN' || t.role === 'SOCIETY_ADMIN';
                          const label = isAdmin ? `${name} (Admin)` : name;
                          return (
                            <option key={t.id} value={t.id}>
                              {label}
                            </option>
                          );
                        })
                      ) : (
                        <>
                          <option value="1">Technician Rajesh Kumar (Electrical & Pumps)</option>
                          <option value="2">Technician Suresh Patil (Mechanical Maintenance)</option>
                          <option value="3">Operator Amit Verma (SCADA & Automation)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 block">Estimated Start Date</label>
                      <CustomDatePicker
                        name="estStartDate"
                        value={estStartDate}
                        onChange={(e: any) => setEstStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 block">Estimated End Date</label>
                      <CustomDatePicker
                        name="estEndDate"
                        value={estEndDate}
                        onChange={(e: any) => setEstEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block">Manager Instructions / Remarks</label>
                    <textarea
                      rows={2}
                      value={managerRemarks}
                      onChange={e => setManagerRemarks(e.target.value)}
                      placeholder="Optional instructions for technician regarding spare parts or safety rules..."
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    onClick={handleApproveSubmit}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Approve & Assign Work Order
                  </button>
                </div>
              )}

              {activeAction === 'REJECT' && (
                <div className="space-y-4 bg-red-50/50 border border-red-200 rounded-2xl p-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-red-800 block">
                      Mandatory Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Provide clear rationale for rejection (e.g. duplicate request, machine already serviced, insufficient data)..."
                      className="w-full p-3 bg-white border border-red-300 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-red-500"
                    />
                  </div>
                  <p className="text-[11px] text-red-600">
                    * Rejecting this request will notify the creator, move the record to the Rejected WO Database, and reflect it under the Rejected WO tab.
                  </p>

                  <button
                    onClick={handleRejectSubmit}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                    Confirm Rejection & Move to Rejected Database
                  </button>
                </div>
              )}

              {activeAction === 'ESCALATE' && (
                <div className="space-y-4 bg-amber-50/60 border border-amber-200 rounded-2xl p-4 text-xs space-y-3">
                  <p className="text-gray-700 font-medium">
                    Escalating this work order immediately alerts the <strong>Maintenance Head</strong> and higher-level plant managers for priority intervention.
                  </p>
                  <button
                    onClick={handleEscalateSubmit}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <ArrowUpRight size={18} />}
                    Trigger Auto Escalation to Maintenance Head
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Image Viewer Modal */}
      {viewingMediaUrl && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setViewingMediaUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
          >
            <X size={28} />
          </button>
          <img src={viewingMediaUrl} alt="Attached proof view" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
        </div>
      )}
    </AnimatePresence>
  );
}
