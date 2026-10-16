import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Calendar,
  Package,
  Bell,
  FileText,
  Paperclip,
  History,
  Cpu,
  Clock,
  Plus,
  Trash2,
  Upload,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { scheduleService } from '../../../services/scheduleService';
import { api } from '../../../lib/api';
import { SpareSelectionTable } from '../../../components/schedules/SpareSelectionTable';
import { CheckpointMasterModal } from '../../../components/checkpoints/CheckpointMasterModal';

export function AddSchedulePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetMachineId = searchParams.get('machineId');

  // Active Tab: 1. General, 2. Scheduling, 3. Check Points, 4. Spares, 5. Notifications, 6. Notes, 7. Files, 8. Logs
  const [activeSubTab, setActiveSubTab] = useState<
    'GENERAL' | 'SCHEDULING' | 'CHECKPOINTS' | 'SPARES' | 'NOTIFICATIONS' | 'NOTES' | 'FILES' | 'LOGS'
  >('GENERAL');

  // General Tab Fields
  const [selectedMachineId, setSelectedMachineId] = useState<number | string>('');
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [machinesList, setMachinesList] = useState<any[]>([]);
  const [scheduleType, setScheduleType] = useState<'PREVENTIVE' | 'PREDICTIVE' | 'CONDITION' | 'BREAKDOWN'>('PREVENTIVE');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');

  // Scheduling Tab Fields
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [prePlanTolerance, setPrePlanTolerance] = useState<number>(2);
  const [postPlanTolerance, setPostPlanTolerance] = useState<number>(2);
  const [triggerTime, setTriggerTime] = useState('09:00');

  // Tasks & Checkpoints Grid
  const [tasks, setTasks] = useState<{ description: string; taskType: string; standardValue?: string }[]>([
    { description: 'Inspect pump mechanical seal grease and vibration spectrum', taskType: 'INSPECTION', standardValue: 'Normal < 2.5 mm/s' },
    { description: 'Check suction & discharge pressure gauges calibration', taskType: 'CALIBRATION', standardValue: '2.0 - 4.5 Bar' },
  ]);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskType, setNewTaskType] = useState('INSPECTION');
  const [newTaskStandard, setNewTaskStandard] = useState('');

  // Checkpoint Modal
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);

  // Spares Tab (Frame 24 Table)
  const [selectedSpares, setSelectedSpares] = useState<
    { sparePartId?: number; partName: string; partCode?: string; quantity: number; unitCost?: number }[]
  >([]);

  // Notifications Tab
  const [notifyEngineers, setNotifyEngineers] = useState(true);
  const [notifyTechnicians, setNotifyTechnicians] = useState(true);
  const [notifyOperators, setNotifyOperators] = useState(true);
  const [additionalEmails, setAdditionalEmails] = useState('maint.lead@gmark.com');

  // Notes & Files
  const [notes, setNotes] = useState('Bi-monthly preventive pump shaft alignment and bearing lubrication check.');
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const res = await api.get('/machines');
      if (res.data && Array.isArray(res.data)) {
        setMachinesList(res.data);
        if (targetMachineId) {
          const found = res.data.find(m => String(m.id) === String(targetMachineId));
          if (found) {
            setSelectedMachineId(found.id);
            setSelectedMachine(found);
            return;
          }
        }
        if (res.data.length > 0) {
          setSelectedMachineId(res.data[0].id);
          setSelectedMachine(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch machines:', err);
    } finally {
      setLoading(false);
    }
  };

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
    if (!newTaskDesc.trim()) {
      toast.error('Please enter a check point description');
      return;
    }
    setTasks(prev => [...prev, { description: newTaskDesc.trim(), taskType: newTaskType, standardValue: newTaskStandard.trim() || undefined }]);
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
      const payload = {
        machineId: Number(selectedMachineId),
        scheduleType,
        frequency,
        priority,
        startDate,
        prePlanToleranceDays: Number(prePlanTolerance),
        postPlanToleranceDays: Number(postPlanTolerance),
        triggerTime,
        notes,
        notifyUsers: [additionalEmails],
        tasks,
        spares: selectedSpares,
      };

      const res = await scheduleService.createSchedule(payload);
      toast.success(`Maintenance Schedule ${res.scheduleCode || 'SCH-2026-XXXX'} saved successfully!`);
      navigate('/schedules');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save maintenance schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="sm:p-6 w-full h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="sm:p-6 pb-10 w-full h-full flex flex-col overflow-y-auto bg-gray-50/50">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
        <span className="cursor-pointer hover:text-gray-800" onClick={() => navigate('/')}>Dashboard</span>
        <span>&gt;</span>
        <span className="cursor-pointer hover:text-gray-800" onClick={() => navigate('/schedules')}>Schedules</span>
        <span>&gt;</span>
        <span className="text-gray-900 font-bold">New</span>
      </div>

      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/schedules')}
          className="text-gray-800 hover:text-gray-900 mr-2 focus:outline-none cursor-pointer flex items-center justify-center p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={22} className="stroke-[2.5]" />
        </button>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">New Schedule Maintenance</h1>
      </div>

      {/* Form Card Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 sm:p-8 space-y-6">
        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4 overflow-x-auto">
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
                className={`py-2 px-3.5 text-xs font-bold whitespace-nowrap rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TAB 1: GENERAL */}
          {activeSubTab === 'GENERAL' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Machine <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedMachineId}
                    onChange={e => handleMachineSelect(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
                  >
                    <option value="">Select Machine</option>
                    {machinesList.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.machineCode || `ID-${m.id}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Maintenance Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={scheduleType}
                    onChange={e => setScheduleType(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
                  >
                    <option value="PREVENTIVE">Preventive Maintenance</option>
                    <option value="PREDICTIVE">Predictive Diagnostic</option>
                    <option value="CONDITION">Condition Based</option>
                    <option value="BREAKDOWN">Breakdown Routine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              {/* Auto-populated Make & Model */}
              {selectedMachine && (
                <div className="bg-green-50/50 border border-green-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block font-semibold text-[10px] uppercase">MAKE & MODEL</span>
                    <span className="font-bold text-gray-900 mt-0.5 block">{selectedMachine.make || 'Grundfos'} / {selectedMachine.modelNumber || 'CRN-15'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold text-[10px] uppercase">SERIAL NUMBER</span>
                    <span className="font-bold text-gray-900 mt-0.5 block">{selectedMachine.serialNumber || 'SN-2026-90'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold text-[10px] uppercase">CATEGORY</span>
                    <span className="font-bold text-gray-900 mt-0.5 block">{selectedMachine.machineCategory || 'Hydropneumatic'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold text-[10px] uppercase">FACILITY</span>
                    <span className="font-bold text-gray-900 mt-0.5 block">{selectedMachine.facility?.facilityName || 'Phase-1 Plant'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCHEDULING MATRIX & TOLERANCES */}
          {activeSubTab === 'SCHEDULING' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 outline-none focus:border-green-500 transition-all cursor-pointer"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 outline-none focus:border-green-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trigger Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={triggerTime}
                    onChange={e => setTriggerTime(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 outline-none focus:border-green-500 transition-all"
                  />
                </div>
              </div>

              {/* Pre / Post Plan Tolerances */}
              <div className="p-4 bg-green-50/40 border border-green-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                  Custom Schedule Tolerances
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Pre-Plan Tolerance (Days Before)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={prePlanTolerance}
                      onChange={e => setPrePlanTolerance(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Post-Plan Tolerance (Days After)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={postPlanTolerance}
                      onChange={e => setPostPlanTolerance(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold"
                    />
                  </div>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
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
                      placeholder="e.g. Inspect motor bearing vibration & temperature..."
                      className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Inspection Type</label>
                    <select
                      value={newTaskType}
                      onChange={e => setNewTaskType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                      placeholder="e.g. Pass / < 2.5 mm/s"
                      className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
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
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Check Point Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Standard Expected Value</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          No check points added yet. Use the form above to add custom check points.
                        </td>
                      </tr>
                    ) : (
                      tasks.map((task, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-3.5 font-semibold text-gray-900">{task.description}</td>
                          <td className="px-4 py-3.5">
                            <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full font-bold text-[10px]">
                              {task.taskType}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-gray-700">
                            {task.standardValue || '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveTask(idx)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove Check Point"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
            <div className="space-y-4 bg-gray-50 border border-gray-200 rounded-xl p-5">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                Automated Pre-Trigger Alert Dispatch Config
              </span>

              <div className="space-y-3 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={notifyEngineers}
                    onChange={e => setNotifyEngineers(e.target.checked)}
                    className="w-4 h-4 rounded text-green-600 border-gray-300"
                  />
                  <span>Send automated notification to Maintenance Engineers prior to trigger time ({triggerTime})</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={notifyTechnicians}
                    onChange={e => setNotifyTechnicians(e.target.checked)}
                    className="w-4 h-4 rounded text-green-600 border-gray-300"
                  />
                  <span>Send automated notification to Assigned Technicians</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={notifyOperators}
                    onChange={e => setNotifyOperators(e.target.checked)}
                    className="w-4 h-4 rounded text-green-600 border-gray-300"
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
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          {/* TAB 6: NOTES */}
          {activeSubTab === 'NOTES' && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Operational Guidelines & Schedule Notes
              </label>
              <textarea
                rows={5}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter detailed maintenance procedure notes, safety interlock precautions..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 outline-none focus:border-green-500 transition-all placeholder-gray-400"
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
                  <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 group-hover:border-blue-300 text-blue-600 group-hover:scale-105 transition-all flex items-center justify-center shadow-xs">
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
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all pointer-events-none"
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
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 font-bold">
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
            <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-xl p-5 text-xs">
              <span className="font-bold text-gray-800 block uppercase">Audit Log History</span>
              <div className="p-3 bg-white rounded-lg border border-gray-200 text-gray-600">
                <span className="font-bold text-gray-900 block mb-1">CREATED</span>
                <span>Schedule initialization prepared by Maintenance Manager.</span>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-10 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={() => navigate('/schedules')}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-70 min-w-[90px] cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
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
    </div>
  );
}
