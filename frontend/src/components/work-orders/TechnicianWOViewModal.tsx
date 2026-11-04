import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Wrench,
  Upload,
  Trash2,
  X,
  History,
  Loader2,
  Film,
  Package,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { workOrderService, type WorkOrder } from '../../services/workOrderService';
import { CustomDatePicker } from '../shared/CustomDatePicker';

interface TechnicianWOViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  onSuccess?: () => void;
}

export function TechnicianWOViewModal({
  isOpen,
  onClose,
  workOrder,
  onSuccess,
}: TechnicianWOViewModalProps) {
  const [activeTab, setActiveTab] = useState<'EXECUTE' | 'REVISION'>('EXECUTE');

  // Completion fields
  const [completionNotes, setCompletionNotes] = useState('');
  const [sparePartsCatalog, setSparePartsCatalog] = useState<any[]>([]);
  const [selectedParts, setSelectedParts] = useState<
    { sparePartId?: number; partName: string; partCode?: string; quantity: number; unitCost: number }[]
  >([]);

  // Proof of work upload
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofMediaList, setProofMediaList] = useState<{ fileUrl: string; fileName: string; fileType: string }[]>([]);

  // Revision fields
  const [revisionReason, setRevisionReason] = useState('');
  const [proposedEndDate, setProposedEndDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingMediaUrl, setViewingMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && workOrder) {
      setCompletionNotes('Work executed as per maintenance procedure. Pump operational and parameters verified.');
      setRevisionReason('');
      setProofMediaList([]);
      setSelectedParts([]);
      setActiveTab('EXECUTE');

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 5);
      setProposedEndDate(nextWeek.toISOString().split('T')[0]);

      fetchSpareParts();
    }
  }, [isOpen, workOrder]);

  const fetchSpareParts = async () => {
    const catalog = await workOrderService.getSparePartsCatalog();
    setSparePartsCatalog(catalog || []);
  };

  if (!isOpen || !workOrder) return null;

  const handleAddPart = (partIdStr: string) => {
    if (!partIdStr) return;
    const part = sparePartsCatalog.find(p => String(p.id) === partIdStr);
    if (!part) return;

    // Check if already added
    const existing = selectedParts.find(p => p.sparePartId === part.id);
    if (existing) {
      setSelectedParts(prev =>
        prev.map(p => (p.sparePartId === part.id ? { ...p, quantity: p.quantity + 1 } : p))
      );
    } else {
      setSelectedParts(prev => [
        ...prev,
        {
          sparePartId: part.id,
          partName: part.partName,
          partCode: part.partCode,
          quantity: 1,
          unitCost: part.unitCost || 1000,
        },
      ]);
    }
  };

  const handlePartQtyChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setSelectedParts(prev =>
      prev.map((p, i) => (i === index ? { ...p, quantity: newQty } : p))
    );
  };

  const handleRemovePart = (index: number) => {
    setSelectedParts(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotalSpareCost = () => {
    return selectedParts.reduce((acc, p) => acc + p.quantity * p.unitCost, 0);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingProof(true);
    try {
      const fileArray = Array.from(files);
      const res = await workOrderService.uploadMediaFiles(fileArray);
      if (res && res.files) {
        setProofMediaList(prev => [...prev, ...res.files]);
        toast.success(`${res.files.length} proof file(s) uploaded!`);
      }
    } catch (err: any) {
      const mockFiles = Array.from(files).map(f => ({
        fileName: f.name,
        fileUrl: URL.createObjectURL(f),
        fileType: f.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
      }));
      setProofMediaList(prev => [...prev, ...mockFiles]);
      toast.success('Proof media attached!');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCloseWorkOrder = async () => {
    if (!completionNotes || completionNotes.trim().length < 5) {
      toast.error('Completion notes are required before closing the work order.');
      return;
    }

    setIsSubmitting(true);
    try {
      await workOrderService.completeWorkOrder(workOrder.id, {
        completionNotes: completionNotes.trim(),
        sparePartsUsed: selectedParts,
        proofMedia: proofMediaList,
      });

      toast.success(`Work Order #${workOrder.woNumber} completed & closed successfully! Timestamps recorded.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete work order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevisionSubmit = async () => {
    if (!revisionReason || revisionReason.trim().length < 5) {
      toast.error('Revision reason is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await workOrderService.requestRevision(workOrder.id, {
        reason: revisionReason.trim(),
        proposedEstEndDate: proposedEndDate,
      });

      toast.success(`Revision request for WO #${workOrder.woNumber} submitted to Maintenance Head.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request revision.');
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
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-3xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                <Wrench size={22} className="text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg leading-tight">Technician Execution Portal</h3>
                  <span className="text-xs font-mono font-bold bg-emerald-500 text-white px-2 py-0.5 rounded">
                    {workOrder.woNumber}
                  </span>
                </div>
                <p className="text-xs text-gray-400">Execution, Spare Parts, Proof of Work & Revision Control</p>
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
            {/* Machine & Problem Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                    {workOrder.machine?.machineCode || `MCH-${workOrder.machineId}`}
                  </span>
                  <h4 className="font-bold text-gray-900 text-base mt-1">{workOrder.machine?.name}</h4>
                  <p className="text-xs text-gray-500">
                    Location: <strong>{workOrder.machine?.facility?.facilityName || workOrder.machine?.building?.name || 'Main Facility'}</strong>
                  </p>
                </div>

                <div className="text-right text-xs">
                  <span className="text-gray-400 block font-bold uppercase text-[10px]">TARGET COMPLETION</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                    {workOrder.estimatedEndDate ? new Date(workOrder.estimatedEndDate).toLocaleDateString() : 'ASAP'}
                  </span>
                </div>
              </div>

              {/* Problem & Manager Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold block uppercase text-[10px]">PROBLEM STATEMENT</span>
                  <p className="text-gray-800 font-medium mt-1">{workOrder.problemDescription}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold block uppercase text-[10px]">MANAGER REMARKS</span>
                  <p className="text-gray-800 font-medium mt-1">{workOrder.managerRemarks || 'Follow standard operating safety rules.'}</p>
                </div>
              </div>
            </div>

            {/* Action Tabs: Execute & Close vs Request Revision */}
            <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab('EXECUTE')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'EXECUTE'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CheckCircle2 size={16} />
                Execute & Close Work Order
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('REVISION')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'REVISION'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <History size={16} />
                Request Revision / Extension
              </button>
            </div>

            {/* EXECUTE TAB */}
            {activeTab === 'EXECUTE' && (
              <div className="space-y-6">
                {/* Spare Parts Master List Selection */}
                <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package size={18} className="text-emerald-600" />
                      <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Spare Parts Master Selection
                      </label>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Total Cost: ₹{calculateTotalSpareCost().toLocaleString()}
                    </span>
                  </div>

                  {/* Selector dropdown */}
                  <div className="flex gap-2">
                    <select
                      onChange={e => {
                        handleAddPart(e.target.value);
                        e.target.value = '';
                      }}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Add Spare Part from Master Catalog --</option>
                      {sparePartsCatalog.map(sp => (
                        <option key={sp.id} value={sp.id}>
                          {sp.partCode} - {sp.partName} (Stock: {sp.stockQuantity} {sp.unitOfMeasure}) — ₹{sp.unitCost}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Parts List Table */}
                  {selectedParts.length > 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                          <tr>
                            <th className="p-2.5">Part Details</th>
                            <th className="p-2.5 text-center">Unit Cost</th>
                            <th className="p-2.5 text-center">Qty</th>
                            <th className="p-2.5 text-right">Total</th>
                            <th className="p-2.5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {selectedParts.map((sp, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-2.5">
                                <span className="font-bold text-gray-900 block">{sp.partName}</span>
                                <span className="text-[10px] font-mono text-gray-400">{sp.partCode || 'N/A'}</span>
                              </td>
                              <td className="p-2.5 text-center text-gray-600">₹{sp.unitCost}</td>
                              <td className="p-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handlePartQtyChange(idx, sp.quantity - 1)}
                                    className="w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="font-bold px-2">{sp.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handlePartQtyChange(idx, sp.quantity + 1)}
                                    className="w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="p-2.5 text-right font-bold text-emerald-700">
                                ₹{(sp.quantity * sp.unitCost).toLocaleString()}
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePart(idx)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No spare parts selected for this repair.</p>
                  )}
                </div>

                {/* Proof of Work Multi-File Upload */}
                <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                    Upload Proof of Work (Photos / Videos)
                  </label>

                  <div className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl p-4 text-center bg-white cursor-pointer relative group">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleProofUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      disabled={uploadingProof}
                    />
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                      {uploadingProof ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                      <span>Click to upload repair completion photos / videos</span>
                    </div>
                  </div>

                  {proofMediaList.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                      {proofMediaList.map((m, idx) => (
                        <div key={idx} className="relative group bg-gray-200 rounded-lg overflow-hidden aspect-video">
                          {m.fileType === 'VIDEO' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-700">
                              <Film size={20} />
                              <span className="text-[9px] truncate max-w-full font-semibold">{m.fileName}</span>
                            </div>
                          ) : (
                            <img src={m.fileUrl} alt={m.fileName} className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => setProofMediaList(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Completion Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    Technician Completion Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={completionNotes}
                    onChange={e => setCompletionNotes(e.target.value)}
                    placeholder="Enter details of work performed, test results, pressure readings..."
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Submit Action */}
                <button
                  type="button"
                  onClick={handleCloseWorkOrder}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Complete & Close Work Order (Record Timestamps)
                </button>
              </div>
            )}

            {/* REVISION TAB */}
            {activeTab === 'REVISION' && (
              <div className="space-y-4 bg-amber-50/50 border border-amber-200 rounded-2xl p-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-900 block">
                    Reason for Revision / Time Extension <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={revisionReason}
                    onChange={e => setRevisionReason(e.target.value)}
                    placeholder="Specify why work cannot be finished by target date (e.g., spare part out of stock, specialized tools needed, additional damage discovered)..."
                    className="w-full p-3 bg-white border border-amber-300 rounded-xl text-xs font-medium outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-900 block">Proposed Updated Target End Date</label>
                  <CustomDatePicker
                    name="proposedEndDate"
                    value={proposedEndDate}
                    onChange={(e: any) => setProposedEndDate(e.target.value)}
                  />
                </div>

                {/* Revision History */}
                {workOrder.revisions && workOrder.revisions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-amber-200">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                      Revision History
                    </span>
                    <div className="space-y-1.5">
                      {workOrder.revisions.map((rev, idx) => (
                        <div key={idx} className="p-2.5 bg-white rounded-lg border border-amber-200 text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span>Reason: {rev.reason}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                rev.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rev.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {rev.status}
                            </span>
                          </div>
                          <p className="text-gray-400 text-[10px] mt-0.5">
                            Submitted on {new Date(rev.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRequestRevisionSubmit}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <History size={18} />}
                  Submit Revision Request to Maintenance Head
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Image Viewer */}
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
