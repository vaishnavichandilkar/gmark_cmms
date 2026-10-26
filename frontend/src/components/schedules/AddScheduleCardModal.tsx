import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  X,
  Package,
  Bell,
  FileText,
  Paperclip,
  History,
  Cpu,
  Clock,
  Plus,
  ChevronLeft,
  Trash2,
  Upload,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { scheduleService } from '../../services/scheduleService';
import { SpareSelectionTable } from './SpareSelectionTable';
import { CheckpointMasterModal } from '../checkpoints/CheckpointMasterModal';

interface AddScheduleCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  machinesList?: any[];
  onSuccess?: () => void;
}

export function AddScheduleCardModal({
  isOpen,
  onClose,
  machinesList = [],
  onSuccess,
}: AddScheduleCardModalProps) {
  // Active Tab: 1. General, 2. Scheduling, 3. Check Points, 4. Spares, 5. Notifications, 6. Notes, 7. Files, 8. Logs
  const [activeSubTab, setActiveSubTab] = useState<
    'GENERAL' | 'SCHEDULING' | 'CHECKPOINTS' | 'SPARES' | 'NOTIFICATIONS' | 'NOTES' | 'FILES' | 'LOGS'
  >('GENERAL');

  // General Tab Fields
  const [selectedMachineId, setSelectedMachineId] = useState<number | string>('');
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [scheduleType, setScheduleType] = useState<'PREVENTIVE' | 'PREDICTIVE' | 'CONDITION' | 'BREAKDOWN'>('PREVENTIVE');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');

  // Scheduling Tab Fields
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [prePlanTolerance, setPrePlanTolerance] = useState<number>(2);
  const [postPlanTolerance, setPostPlanTolerance] = useState<number>(2);
  const [triggerTime, setTriggerTime] = useState('09:00');

  // Tasks & Checkpoints Grid
  const [tasks, setTasks] = useState<{ description: string; taskType: string; standardValue?: string }[]>([]);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskType, setNewTaskType] = useState('INSPECTION');
  const [newTaskStandard, setNewTaskStandard] = useState('');
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);

  // Spares Tab (Frame 24 Table)
  const [selectedSpares, setSelectedSpares] = useState<
    { sparePartId?: number; partName: string; partCode?: string; quantity: number; unitCost?: number }[]
  >([]);

  // Notifications Tab
  const [notifyEngineers, setNotifyEngineers] = useState(true);
  const [notifyTechnicians, setNotifyTechnicians] = useState(true);
  const [notifyOperators, setNotifyOperators] = useState(true);
  const [additionalEmails, setAdditionalEmails] = useState('');

  // Notes & Files
  const [notes, setNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: number }[]>([]);

  const handleScheduleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).map(f => ({ name: f.name, size: f.size }));
    setAttachedFiles(prev => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} file(s) attached successfully!`);
  };

  const removeScheduleFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('Attached file removed');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (machinesList.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machinesList[0].id);
      setSelectedMachine(machinesList[0]);
    }
  }, [machinesList]);

  if (!isOpen) return null;

  const handleMachineSelect = (mId: string | number) => {
    setSelectedMachineId(mId);
    const found = machinesList.find(m => String(m.id) === String(mId));
    setSelectedMachine(found || null);
  };

  const handleAddTask = (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const description = newTaskDesc.trim() || `Check Point #${tasks.length + 1}`;
    setTasks(prev => [
      ...prev,
      {
        description,
        taskType: newTaskType || 'INSPECTION',
        standardValue: newTaskStandard.trim() || undefined,
      },
    ]);
    setNewTaskDesc('');
    setNewTaskStandard('');
    toast.success('Check point added successfully');
  };

  const handleRemoveTask = (index: number) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
    toast.success('Check point removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineId || !selectedMachine) {
      toast.error('Machine association is required');
      setActiveSubTab('GENERAL');
      return;
    }

    setIsSubmitting(true);
    try {
      const emails = additionalEmails
        ? additionalEmails.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const payload = {
        machineId: Number(selectedMachineId),
        scheduleType,
        frequency,
        priority,
        startDate,
        prePlanToleranceDays: Number(prePlanTolerance) || 1,
        postPlanToleranceDays: Number(postPlanTolerance) || 1,
        triggerTime,
        notes: notes.trim(),
        notifyUsers: emails,
        tasks: tasks.filter(t => t && t.description && t.description.trim()),
        spares: selectedSpares,
      };

      const res = await scheduleService.createSchedule(payload);
      toast.success(`Maintenance Schedule ${res.scheduleCode || 'SCH-2026-XXXX'} configured & saved!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save maintenance schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed inset-0 z-50 bg-white flex flex-col w-full h-full min-h-screen overflow-hidden"
      >
        {/* Full Screen Header */}
        <div className="px-6 sm:px-8 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors focus:outline-none"
              title="Back"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <Calendar size={22} />
              </div>
              <div>
                <h1 className="font-bold text-2xl text-gray-900 leading-tight">Configure Maintenance Schedule</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Plant & Machine Association, Tolerances, Spares Inventory & Automated Notifications
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="px-6 sm:px-8 bg-gray-50 border-b border-gray-200 flex items-center gap-1 overflow-x-auto shrink-0">
          {[
            { id: 'GENERAL', label: '1. General', icon: Cpu },
            { id: 'SCHEDULING', label: '2. Scheduling', icon: Clock },
            { id: 'CHECKPOINTS', label: '3. Check Points', icon: CheckSquare },
            { id: 'SPARES', label: '4. Spares', icon: Package },
            { id: 'NOTIFICATIONS', label: '5. Notifications', icon: Bell },
            { id: 'NOTES', label: '6. Notes', icon: FileText },
            { id: 'FILES', label: '7. Files', icon: Paperclip },
            { id: 'LOGS', label: '8. Logs', icon: History },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`py-3.5 px-4 text-xs font-bold whitespace-nowrap border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-green-600 text-green-600 bg-white shadow-xs'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body - Full Width Grid Layout */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 md:p-10 space-y-8 max-w-7xl w-full mx-auto">
          {/* TAB 1: GENERAL */}
          {activeSubTab === 'GENERAL' && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Machine Association <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMachineId}
                  onChange={e => handleMachineSelect(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                >
                  <option value="">-- Select Machine --</option>
                  {machinesList.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.machineCode || `ID-${m.id}`}) — {m.facility?.facilityName || m.building?.name || 'Main Plant'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-populated Make & Model */}
              {selectedMachine && (
                <div className="bg-green-50/50 border border-green-200 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">MAKE & MODEL</span>
                    <span className="font-bold text-gray-900 text-sm mt-0.5 block">{selectedMachine.make || 'Grundfos'} / {selectedMachine.modelNumber || 'CRN-15'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">SERIAL NUMBER</span>
                    <span className="font-bold text-gray-900 text-sm mt-0.5 block">{selectedMachine.serialNumber || 'SN-2026-90'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">CATEGORY</span>
                    <span className="font-bold text-gray-900 text-sm mt-0.5 block">{selectedMachine.machineCategory || 'Hydropneumatic'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">FACILITY</span>
                    <span className="font-bold text-gray-900 text-sm mt-0.5 block">{selectedMachine.facility?.facilityName || 'Phase-1 Plant'}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Maintenance Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={scheduleType}
                    onChange={e => setScheduleType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                  >
                    <option value="PREVENTIVE">Preventive Maintenance</option>
                    <option value="PREDICTIVE">Predictive Diagnostic</option>
                    <option value="CONDITION">Condition Based</option>
                    <option value="BREAKDOWN">Breakdown Routine</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Priority Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCHEDULING MATRIX & TOLERANCES */}
          {activeSubTab === 'SCHEDULING' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Frequency Interval <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="BIMONTHLY">Bimonthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Trigger Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={triggerTime}
                    onChange={e => setTriggerTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                  />
                </div>
              </div>

              {/* Pre / Post Plan Tolerances */}
              <div className="p-5 bg-green-50/40 border border-green-200 rounded-2xl space-y-4">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                  Custom Schedule Tolerances
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700">Pre-Plan Tolerance (Days Before)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={prePlanTolerance}
                      onChange={e => setPrePlanTolerance(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700">Post-Plan Tolerance (Days After)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={postPlanTolerance}
                      onChange={e => setPostPlanTolerance(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Task Allocation Grid */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Task Allocation & Checkpoint Items
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newTaskDesc}
                    onChange={e => setNewTaskDesc(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTask(e);
                      }
                    }}
                    placeholder="Add task description..."
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 outline-none focus:border-green-500"
                  />
                  <select
                    value={newTaskType}
                    onChange={e => setNewTaskType(e.target.value)}
                    className="px-3 py-3 border border-gray-300 rounded-xl bg-white text-xs font-semibold text-gray-700 outline-none focus:border-green-500"
                  >
                    <option value="INSPECTION">INSPECTION</option>
                    <option value="CLEANING">CLEANING</option>
                    <option value="LUBRICATION">LUBRICATION</option>
                    <option value="REPLACEMENT">REPLACEMENT</option>
                    <option value="CALIBRATION">CALIBRATION</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="px-5 py-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
                  >
                    <Plus size={16} /> Add Task
                  </button>
                </div>

                <div className="space-y-2 pt-1">
                  {tasks.map((t, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center justify-between gap-3">
                      <span className="font-medium text-gray-800 flex-1">{t.description}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full font-bold text-[10px]">{t.taskType}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(idx)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Remove task"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CHECK POINTS */}
          {activeSubTab === 'CHECKPOINTS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Check Points & Inspection Checklist</h3>
                  <p className="text-xs text-gray-500">Define standard expected values, unit of measurement, and tolerance limits for this maintenance schedule.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheckpointModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <Plus size={16} /> Open Master DB Checkpoints
                </button>
              </div>

              {/* Quick Add Form */}
              <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 space-y-4">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Add Custom Check Point</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Check Point Description *</label>
                    <input
                      type="text"
                      value={newTaskDesc}
                      onChange={e => setNewTaskDesc(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTask();
                        }
                      }}
                      placeholder="e.g. Inspect motor bearing vibration & temperature..."
                      className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Inspection Type</label>
                    <select
                      value={newTaskType}
                      onChange={e => setNewTaskType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-green-500"
                    >
                      <option value="INSPECTION">INSPECTION</option>
                      <option value="CLEANING">CLEANING</option>
                      <option value="LUBRICATION">LUBRICATION</option>
                      <option value="REPLACEMENT">REPLACEMENT</option>
                      <option value="CALIBRATION">CALIBRATION</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Standard / Expected Value</label>
                    <input
                      type="text"
                      value={newTaskStandard}
                      onChange={e => setNewTaskStandard(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTask();
                        }
                      }}
                      placeholder="e.g. Pass / < 2.5 mm/s"
                      className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={15} /> Add Check Point
                  </button>
                </div>
              </div>

              {/* Checkpoints Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3">Check Point Description</th>
                      <th className="px-4 py-3 w-36 sm:w-44">Type</th>
                      <th className="px-4 py-3 w-48 sm:w-64">Standard Expected Value</th>
                      <th className="px-4 py-3 text-right w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          <p className="mb-3 text-xs">No check points added yet.</p>
                          <button
                            type="button"
                            onClick={() => handleAddTask()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Plus size={15} /> Add First Check Point
                          </button>
                        </td>
                      </tr>
                    ) : (
                      tasks.map((task, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-2 font-bold text-gray-400 text-center">{idx + 1}</td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={task.description}
                              onChange={(e) => {
                                const updated = [...tasks];
                                updated[idx].description = e.target.value;
                                setTasks(updated);
                              }}
                              placeholder="Enter check point description..."
                              className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={task.taskType}
                              onChange={(e) => {
                                const updated = [...tasks];
                                updated[idx].taskType = e.target.value;
                                setTasks(updated);
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-emerald-800 outline-none focus:border-green-500 cursor-pointer"
                            >
                              <option value="INSPECTION">INSPECTION</option>
                              <option value="CLEANING">CLEANING</option>
                              <option value="LUBRICATION">LUBRICATION</option>
                              <option value="REPLACEMENT">REPLACEMENT</option>
                              <option value="CALIBRATION">CALIBRATION</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={task.standardValue || ''}
                              onChange={(e) => {
                                const updated = [...tasks];
                                updated[idx].standardValue = e.target.value;
                                setTasks(updated);
                              }}
                              placeholder="e.g. Normal / Pass / < 2.5 mm/s"
                              className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveTask(idx)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove Check Point"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Footer Add Row Button */}
                {tasks.length > 0 && (
                  <div className="p-2.5 bg-gray-50/80 border-t border-gray-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleAddTask()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus size={14} /> Add Another Row
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SPARES */}
          {activeSubTab === 'SPARES' && (
            <SpareSelectionTable
              selectedSpares={selectedSpares}
              onSelectionChange={setSelectedSpares}
            />
          )}

          {/* TAB 5: NOTIFICATIONS */}
          {activeSubTab === 'NOTIFICATIONS' && (
            <div className="space-y-6 bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                Automated Pre-Trigger Alert Dispatch Config
              </span>

              <div className="space-y-4 text-xs">
                <label className="flex items-center gap-3 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={notifyEngineers}
                    onChange={e => setNotifyEngineers(e.target.checked)}
                    className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300"
                  />
                  <span>Send automated notification to Maintenance Engineers prior to trigger time ({triggerTime})</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={notifyTechnicians}
                    onChange={e => setNotifyTechnicians(e.target.checked)}
                    className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300"
                  />
                  <span>Send automated notification to Assigned Technicians</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={notifyOperators}
                    onChange={e => setNotifyOperators(e.target.checked)}
                    className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300"
                  />
                  <span>Dispatch copy to Plant Operators & HOD</span>
                </label>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-gray-700">Additional Email Recipients</label>
                <input
                  type="text"
                  value={additionalEmails}
                  onChange={e => setAdditionalEmails(e.target.value)}
                  placeholder="e.g. lead@gmark.com, admin@gmark.com"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm"
                />
              </div>
            </div>
          )}

          {/* TAB 6: NOTES */}
          {activeSubTab === 'NOTES' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Operational Guidelines & Schedule Notes
              </label>
              <textarea
                rows={6}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter detailed maintenance procedure notes, safety interlock precautions..."
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder-gray-400"
              />
            </div>
          )}

          {/* TAB 7: FILES */}
          {activeSubTab === 'FILES' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 hover:border-green-500 rounded-2xl p-8 text-center bg-gray-50/70 hover:bg-green-50/20 transition-all relative group cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.dwg,.xls,.xlsx"
                  onChange={handleScheduleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 group-hover:border-green-300 text-green-600 group-hover:scale-105 transition-all flex items-center justify-center shadow-xs">
                    <Upload size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      Click or Drag & Drop Attachment Files
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload machine manual PDFs, electrical single-line diagrams, SOPs, or DWG drawings (Max 25MB)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all pointer-events-none"
                  >
                    <Paperclip size={15} /> Browse Files
                  </button>
                </div>
              </div>

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Attached Documents ({attachedFiles.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachedFiles.map((file, idx) => (
                      <div key={idx} className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-9 h-9 rounded-lg bg-green-50 text-green-700 flex items-center justify-center shrink-0 font-bold">
                            <FileText size={18} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-gray-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeScheduleFile(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                          title="Remove File"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: LOGS */}
          {activeSubTab === 'LOGS' && (
            <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-2xl p-6 text-xs">
              <span className="font-bold text-gray-800 block uppercase">Audit Log History</span>
              <div className="p-4 bg-white rounded-xl border border-gray-200 text-gray-600">
                <span className="font-bold text-gray-900 block mb-1">CREATED</span>
                <span>Schedule initialization prepared by Maintenance Manager.</span>
              </div>
            </div>
          )}
        </form>

        {/* Sticky Footer Bar */}
        <div className="sticky bottom-0 bg-white px-6 sm:px-8 py-4 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0 shadow-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-70 min-w-[100px] cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Save'
            )}
          </button>
        </div>

        {/* Checkpoint Master Modal */}
        {showCheckpointModal && selectedMachineId && (
          <CheckpointMasterModal
            isOpen={showCheckpointModal}
            onClose={() => setShowCheckpointModal(false)}
            machineId={Number(selectedMachineId)}
            onSuccess={(createdObj) => {
              if (createdObj?.master?.description) {
                setTasks(prev => [
                  ...prev,
                  {
                    description: createdObj.master.description,
                    taskType: createdObj.master.checkpointType || 'INSPECTION',
                    standardValue: createdObj.master.standardValue || undefined,
                  },
                ]);
              }
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
