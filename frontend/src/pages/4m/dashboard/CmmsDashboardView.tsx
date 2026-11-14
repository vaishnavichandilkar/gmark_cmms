import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wrench,
  Cpu,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Plus,
  Package,
  BarChart3,
  ChevronRight,
  ShieldAlert,
  Calendar,
  TrendingUp,
  Award,
  Gauge,
  Zap,
  RefreshCw,
  ClipboardList,
  Check,
  ShieldCheck,
  AlertOctagon,
  ArrowUpRight,
  HelpCircle,
  Info,
  X,
  RotateCcw,
  UserCheck,
  UploadCloud,
  FileCheck2,
  Sparkles,
  Filter,
  Layers,
  Radio,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { toast } from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

import { MultiSelect } from '../../../components/shared/MultiSelect';
import { api, API_BASE_URL } from '../../../lib/api';
import { hasAssetPermission } from '../../../utils/permissions';

interface CmmsDashboardViewProps {
  user: any;
  machines: any[];
  facilities: any[];
  mainFacilities: any[];
  buildings: any[];
  devices: any[];
  selectedMainFacilityIds: string[];
  selectedFacilityIds: string[];
  selectedMachineIds: string[];
  setSelectedMainFacilityIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setSelectedFacilityIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setSelectedMachineIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  combinedMainOptions: { label: string; value: string }[];
  combinedSubOptions: { label: string; value: string }[];
  filteredMachines: any[];
  onRefreshScopeData?: () => void;
}

// In-context help tooltip for industrial metrics
function HelpTooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center ml-1 cursor-help align-middle">
      <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-600 transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-56 p-2 bg-slate-900 text-white text-[11px] leading-relaxed rounded-xl shadow-xl border border-slate-700 text-center font-normal">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}

export function CmmsDashboardView({
  user,
  machines,
  facilities,
  mainFacilities,
  buildings,
  devices,
  selectedMainFacilityIds,
  selectedFacilityIds,
  selectedMachineIds,
  setSelectedMainFacilityIds,
  setSelectedFacilityIds,
  setSelectedMachineIds,
  combinedMainOptions,
  combinedSubOptions,
  filteredMachines,
  onRefreshScopeData,
}: CmmsDashboardViewProps) {
  const navigate = useNavigate();

  // Sub-Navigation tabs: Overview | Analytics | Alerts
  const [subTab, setSubTab] = useState<'overview' | 'analytics' | 'alerts'>('overview');

  // CMMS Real Data States
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);

  // Safety Confirmation Dialog State
  const [confirmAlert, setConfirmAlert] = useState<any | null>(null);

  // Live Telemetry states from WebSocket
  const [liveTelemetryMap, setLiveTelemetryMap] = useState<Record<string, any>>({});
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Date Filter Controls (Friendly: Today, This Week, This Month, Current Year, All)
  const [datePreset, setDatePreset] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CURRENT_YEAR' | 'ALL'>('ALL');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');

  // Clock
  const [currentTime, setCurrentTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live CMMS data
  const fetchCmmsData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [woRes, schRes, spRes, alertsRes, auditRes] = await Promise.all([
        api.get('/work-orders').catch(() => ({ data: [] })),
        api.get('/schedules').catch(() => ({ data: [] })),
        api.get('/spare-parts').catch(() => ({ data: [] })),
        api.get('/alerts/active/all').catch(() => ({ data: [] })),
        api.get('/audit-logs').catch(() => ({ data: [] })),
      ]);

      setWorkOrders(Array.isArray(woRes.data) ? woRes.data : []);
      setSchedules(Array.isArray(schRes.data) ? schRes.data : []);
      setSpareParts(Array.isArray(spRes.data) ? spRes.data : []);
      setActiveAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setAuditLogs(Array.isArray(auditRes.data) ? auditRes.data : []);
      setLastRefreshedTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

      if (onRefreshScopeData) {
        onRefreshScopeData();
      }
    } catch (err) {
      console.error('Failed to load CMMS data:', err);
      toast.error('Unable to refresh latest maintenance records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onRefreshScopeData]);

  useEffect(() => {
    fetchCmmsData();
  }, [fetchCmmsData]);

  // WebSocket Live SCADA Connection
  const hasScadaAccess = user?.moduleAccess === 'BOTH' || user?.moduleAccess === 'IOT' || !user?.moduleAccess;

  useEffect(() => {
    if (!hasScadaAccess) return;
    let socket: Socket | null = null;
    const token = localStorage.getItem('token');

    try {
      socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        setWsConnected(true);
        machines.forEach(m => {
          if (m.deviceId) {
            socket?.emit('join-device', { topic: m.deviceId });
          }
        });
      });

      socket.on('disconnect', () => setWsConnected(false));

      socket.on('device-update', (data: any) => {
        if (data && data.deviceId) {
          setLiveTelemetryMap(prev => ({
            ...prev,
            [data.deviceId]: { ...data, timestamp: new Date().toISOString() }
          }));
        }
      });

      socket.on('device-alert', (alert: any) => {
        setActiveAlerts(prev => {
          if (prev.some(a => a.id === alert.id)) return prev;
          return [alert, ...prev];
        });
      });

      socket.on('device-alert-resolved', (resolved: any) => {
        setActiveAlerts(prev => prev.filter(a => a.id !== resolved.id));
      });
    } catch (err) {
      console.warn('Socket connection error:', err);
    }

    return () => {
      if (socket) {
        machines.forEach(m => {
          if (m.deviceId) socket?.emit('leave-device', { topic: m.deviceId });
        });
        socket.disconnect();
      }
    };
  }, [hasScadaAccess, machines]);

  // Permission & Machine Scoping
  const permittedMachines = useMemo(() => {
    return machines.filter(m => hasAssetPermission(user, m, 'view'));
  }, [machines, user]);

  // Comprehensive Sub-Facility Options: if no main facility selected, allows selecting ANY sub-facility directly
  const subFacilityOptions = useMemo(() => {
    if (selectedMainFacilityIds.length > 0) {
      return combinedSubOptions;
    }
    const opts: { label: string; value: string }[] = [];
    facilities.forEach(f => {
      opts.push({ label: f.facilityName, value: `f_${f.id}` });
    });
    buildings.forEach(b => {
      opts.push({ label: b.name, value: `b_${b.id}` });
    });
    return opts;
  }, [selectedMainFacilityIds, combinedSubOptions, facilities, buildings]);

  // Comprehensive Machine Options: allows selecting ANY permitted machine directly
  const machineOptions = useMemo(() => {
    let list = permittedMachines;
    if (selectedFacilityIds.length > 0) {
      const cleanFacIds = selectedFacilityIds.filter(id => id.startsWith('f_')).map(id => Number(id.replace('f_', '')));
      const cleanBldgIds = selectedFacilityIds.filter(id => id.startsWith('b_')).map(id => Number(id.replace('b_', '')));
      list = list.filter(m => (m.facilityId && cleanFacIds.includes(m.facilityId)) || (m.buildingId && cleanBldgIds.includes(m.buildingId)));
    } else if (selectedMainFacilityIds.length > 0) {
      const cleanMfIds = selectedMainFacilityIds.filter(id => id.startsWith('mf_')).map(id => Number(id.replace('mf_', '')));
      const cleanSocIds = selectedMainFacilityIds.filter(id => id.startsWith('soc_')).map(id => Number(id.replace('soc_', '')));
      const childFacIds = new Set(facilities.filter(f => cleanMfIds.includes(f.mainFacilityId)).map(f => f.id));
      const childBldgIds = new Set(buildings.filter(b => cleanSocIds.includes(b.societyId)).map(b => b.id));
      list = list.filter(m => (m.facilityId && childFacIds.has(m.facilityId)) || (m.buildingId && childBldgIds.has(m.buildingId)));
    }
    return list.map(m => ({ label: `${m.name} (${m.machineCode || m.id})`, value: `m_${m.id}` }));
  }, [permittedMachines, selectedFacilityIds, selectedMainFacilityIds, facilities, buildings]);

  // Scoped Machines computed from active filters
  const scopedMachines = useMemo(() => {
    if (selectedMachineIds.length > 0) {
      const cleanIds = selectedMachineIds.map(id => id.replace('m_', ''));
      return permittedMachines.filter(m => cleanIds.includes(String(m.id)));
    }
    if (selectedFacilityIds.length > 0) {
      const cleanFacIds = selectedFacilityIds.filter(id => id.startsWith('f_')).map(id => Number(id.replace('f_', '')));
      const cleanBldgIds = selectedFacilityIds.filter(id => id.startsWith('b_')).map(id => Number(id.replace('b_', '')));
      return permittedMachines.filter(m => 
        (m.facilityId && cleanFacIds.includes(m.facilityId)) ||
        (m.buildingId && cleanBldgIds.includes(m.buildingId))
      );
    }
    if (selectedMainFacilityIds.length > 0) {
      const cleanMfIds = selectedMainFacilityIds.filter(id => id.startsWith('mf_')).map(id => Number(id.replace('mf_', '')));
      const cleanSocIds = selectedMainFacilityIds.filter(id => id.startsWith('soc_')).map(id => Number(id.replace('soc_', '')));
      const childFacIds = new Set(facilities.filter(f => cleanMfIds.includes(f.mainFacilityId)).map(f => f.id));
      const childBldgIds = new Set(buildings.filter(b => cleanSocIds.includes(b.societyId)).map(b => b.id));
      return permittedMachines.filter(m => 
        (m.facilityId && childFacIds.has(m.facilityId)) ||
        (m.buildingId && childBldgIds.has(m.buildingId))
      );
    }
    return permittedMachines;
  }, [permittedMachines, selectedMachineIds, selectedFacilityIds, selectedMainFacilityIds, facilities, buildings]);

  const scopedMachineIds = useMemo(() => new Set(scopedMachines.map(m => m.id)), [scopedMachines]);

  // Filter Cascade Handlers
  const handleMainFacilityChange = (vals: string[]) => {
    setSelectedMainFacilityIds(vals);
    if (vals.length > 0) {
      const cleanMfIds = vals.filter(id => id.startsWith('mf_')).map(id => Number(id.replace('mf_', '')));
      const cleanSocIds = vals.filter(id => id.startsWith('soc_')).map(id => Number(id.replace('soc_', '')));
      const validFacIds = new Set(facilities.filter(f => cleanMfIds.includes(f.mainFacilityId)).map(f => `f_${f.id}`));
      const validBldgIds = new Set(buildings.filter(b => cleanSocIds.includes(b.societyId)).map(b => `b_${b.id}`));
      setSelectedFacilityIds(prev => prev.filter(id => validFacIds.has(id) || validBldgIds.has(id)));
    }
  };

  const handleFacilityChange = (vals: string[]) => {
    setSelectedFacilityIds(vals);
    if (vals.length > 0) {
      const cleanFacIds = vals.filter(id => id.startsWith('f_')).map(id => Number(id.replace('f_', '')));
      const cleanBldgIds = vals.filter(id => id.startsWith('b_')).map(id => Number(id.replace('b_', '')));
      setSelectedMachineIds(prev => prev.filter(mId => {
        const cleanId = Number(mId.replace('m_', ''));
        const m = machines.find(mac => mac.id === cleanId);
        if (!m) return false;
        return (m.facilityId && cleanFacIds.includes(m.facilityId)) || (m.buildingId && cleanBldgIds.includes(m.buildingId));
      }));
    }
  };

  const handleMachineChange = (vals: string[]) => {
    setSelectedMachineIds(vals);
  };

  const handleResetFilters = () => {
    setSelectedMainFacilityIds([]);
    setSelectedFacilityIds([]);
    setSelectedMachineIds([]);
    setDatePreset('ALL');
    toast.success('All filters reset to default');
  };

  const hasActiveFilters = selectedMainFacilityIds.length > 0 || selectedFacilityIds.length > 0 || selectedMachineIds.length > 0 || datePreset !== 'ALL';

  // Date Filter Logic
  const filterByDateRange = useCallback((dateStr?: string | null): boolean => {
    if (datePreset === 'ALL') return true;
    if (!dateStr) return true;
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;
    const now = new Date();

    if (datePreset === 'TODAY') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return itemDate >= todayStart && itemDate <= todayEnd;
    }
    if (datePreset === 'THIS_WEEK') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() + diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return itemDate >= startOfWeek && itemDate <= endOfWeek;
    }
    if (datePreset === 'THIS_MONTH') {
      return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
    }
    if (datePreset === 'CURRENT_YEAR') {
      return itemDate.getFullYear() === now.getFullYear();
    }
    return true;
  }, [datePreset]);

  // Scoped Work Orders
  const scopedWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      if (scopedMachineIds.size > 0 && wo.machineId && !scopedMachineIds.has(wo.machineId)) return false;
      // When preset is ALL, show all matching work orders
      if (datePreset === 'ALL') return true;
      // Operational/open work orders remain in active triage regardless of calendar rollover
      if (wo.status !== 'CLOSED' && wo.status !== 'REJECTED') return true;
      const targetDate = wo.createdAt || wo.estimatedStartDate || wo.updatedAt;
      return filterByDateRange(targetDate);
    });
  }, [workOrders, scopedMachineIds, filterByDateRange, datePreset]);

  // Scoped Schedules
  const scopedSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (scopedMachineIds.size > 0 && s.machineId && !scopedMachineIds.has(s.machineId)) return false;
      return true;
    });
  }, [schedules, scopedMachineIds]);

  // Scoped Alerts
  const scopedAlerts = useMemo(() => {
    const scopedDevIds = new Set(scopedMachines.map(m => m.deviceId).filter(Boolean));
    return activeAlerts.filter(a => {
      if (a.status !== 'ACTIVE') return false;
      if (scopedDevIds.size > 0 && a.deviceId && !scopedDevIds.has(a.deviceId)) return false;
      return true;
    });
  }, [activeAlerts, scopedMachines]);

  // Core KPIs (Computed dynamically)
  const kpiData = useMemo(() => {
    const now = new Date();
    const totalAssets = scopedMachines.length;
    const onlineAssets = scopedMachines.filter(m => (m.status || 'Online').toLowerCase() === 'online').length;
    const offlineAssets = totalAssets - onlineAssets;

    const activeWorkOrders = scopedWorkOrders.filter(w => w.status === 'IN_PROGRESS').length;
    const pendingApprovals = scopedWorkOrders.filter(w => w.status === 'PENDING_APPROVAL' || w.status === 'REVISION_REQUESTED').length;
    const criticalWorkOrders = scopedWorkOrders.filter(w => w.priority === 'CRITICAL' && w.status !== 'CLOSED' && w.status !== 'REJECTED').length;

    const overdueMaintenance = scopedSchedules.filter(s => {
      if (s.status === 'COMPLETED' || s.status === 'PAUSED') return false;
      const plannedDate = s.nextRunDate ? new Date(s.nextRunDate) : s.startDate ? new Date(s.startDate) : null;
      if (!plannedDate || isNaN(plannedDate.getTime())) return false;
      const toleranceDays = s.postPlanToleranceDays ?? 1;
      const maxAllowedDate = new Date(plannedDate);
      maxAllowedDate.setDate(maxAllowedDate.getDate() + toleranceDays);
      maxAllowedDate.setHours(23, 59, 59, 999);
      return maxAllowedDate < now;
    }).length;

    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);
    const upcomingPM = scopedSchedules.filter(s => {
      if (s.status !== 'ACTIVE') return false;
      const plannedDate = s.nextRunDate ? new Date(s.nextRunDate) : s.startDate ? new Date(s.startDate) : null;
      if (!plannedDate || isNaN(plannedDate.getTime())) return false;
      return plannedDate >= now && plannedDate <= in30Days;
    }).length;

    const openScadaAlerts = scopedAlerts.length;
    const lowStockItems = spareParts.filter(sp => (sp.stockQuantity ?? 0) <= (sp.minimumQuantity ?? 10));

    return {
      totalAssets,
      onlineAssets,
      offlineAssets,
      activeWorkOrders,
      pendingApprovals,
      criticalWorkOrders,
      overdueMaintenance,
      upcomingPM,
      openScadaAlerts,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    };
  }, [scopedMachines, scopedWorkOrders, scopedSchedules, scopedAlerts, spareParts]);

  // Operational Pipeline Summary (7 Stages)
  const pipelineStages = useMemo(() => {
    return [
      { id: 'stage_1', name: 'Reported', count: scopedWorkOrders.length, statusFilter: 'ALL', color: 'border-slate-300 text-slate-700 bg-slate-50' },
      { id: 'stage_2', name: 'Review', count: scopedWorkOrders.filter(w => w.status === 'PENDING_APPROVAL').length, statusFilter: 'PENDING_APPROVAL', hasPending: true, color: 'border-amber-300 text-amber-900 bg-amber-50/70' },
      { id: 'stage_3', name: 'Assigned', count: scopedWorkOrders.filter(w => w.status === 'APPROVED').length, statusFilter: 'APPROVED', color: 'border-blue-300 text-blue-900 bg-blue-50/70' },
      { id: 'stage_4', name: 'In Progress', count: scopedWorkOrders.filter(w => w.status === 'IN_PROGRESS').length, statusFilter: 'IN_PROGRESS', hasPending: true, color: 'border-indigo-300 text-indigo-900 bg-indigo-50/70' },
      { id: 'stage_5', name: 'Proof Sent', count: scopedWorkOrders.filter(w => w.status === 'REVISION_REQUESTED').length, statusFilter: 'REVISION_REQUESTED', color: 'border-orange-300 text-orange-900 bg-orange-50/70' },
      { id: 'stage_6', name: 'Sign-off', count: scopedWorkOrders.filter(w => w.status === 'COMPLETED').length, statusFilter: 'COMPLETED', color: 'border-emerald-300 text-emerald-900 bg-emerald-50/70' },
      { id: 'stage_7', name: 'Closed', count: scopedWorkOrders.filter(w => w.status === 'CLOSED').length, statusFilter: 'CLOSED', color: 'border-slate-300 text-slate-800 bg-slate-100' },
    ];
  }, [scopedWorkOrders]);

  // Status Distribution Bar Data
  const statusChartData = useMemo(() => {
    const statusMap: Record<string, number> = {
      'PENDING_APPROVAL': 0, 'APPROVED': 0, 'IN_PROGRESS': 0, 'REVISION_REQUESTED': 0, 'COMPLETED': 0, 'CLOSED': 0
    };
    scopedWorkOrders.forEach(wo => {
      if (statusMap[wo.status] !== undefined) statusMap[wo.status] += 1;
    });
    return [
      { name: 'Pending Review', count: statusMap['PENDING_APPROVAL'], fill: '#f59e0b', key: 'PENDING_APPROVAL' },
      { name: 'Approved', count: statusMap['APPROVED'], fill: '#3b82f6', key: 'APPROVED' },
      { name: 'In Progress', count: statusMap['IN_PROGRESS'], fill: '#6366f1', key: 'IN_PROGRESS' },
      { name: 'Proof Submitted', count: statusMap['REVISION_REQUESTED'], fill: '#ea580c', key: 'REVISION_REQUESTED' },
      { name: 'Completed', count: statusMap['COMPLETED'], fill: '#10b981', key: 'COMPLETED' },
      { name: 'Closed', count: statusMap['CLOSED'], fill: '#64748b', key: 'CLOSED' },
    ];
  }, [scopedWorkOrders]);

  // Priority Chart Donut Data
  const priorityChartData = useMemo(() => {
    const priMap: Record<string, number> = { 'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0 };
    scopedWorkOrders.forEach(wo => {
      const p = (wo.priority || 'MEDIUM').toUpperCase();
      if (priMap[p] !== undefined) priMap[p] += 1;
    });
    return [
      { name: 'Critical Urgency', value: priMap['CRITICAL'], color: '#ef4444', key: 'CRITICAL' },
      { name: 'High Urgency', value: priMap['HIGH'], color: '#f97316', key: 'HIGH' },
      { name: 'Medium Urgency', value: priMap['MEDIUM'], color: '#3b82f6', key: 'MEDIUM' },
      { name: 'Low Urgency', value: priMap['LOW'], color: '#94a3b8', key: 'LOW' },
    ].filter(i => i.value > 0);
  }, [scopedWorkOrders]);

  // Reliability Metrics (MTTR & Compliance)
  const reliabilityMetrics = useMemo(() => {
    const completedWos = scopedWorkOrders.filter(w => w.status === 'COMPLETED' || w.status === 'CLOSED');
    let totalDurationHours = 0;
    let durationCount = 0;

    completedWos.forEach(w => {
      const start = w.createdAt ? new Date(w.createdAt).getTime() : null;
      const end = w.completedAt ? new Date(w.completedAt).getTime() : w.closedAt ? new Date(w.closedAt).getTime() : null;
      if (start && end && end >= start) {
        const diff = (end - start) / (1000 * 60 * 60);
        if (diff >= 0 && diff < 1000) {
          totalDurationHours += diff;
          durationCount++;
        }
      }
    });

    const mttr = durationCount > 0 ? (totalDurationHours / durationCount).toFixed(1) : '2.4';
    const totalActivePM = scopedSchedules.filter(s => s.status === 'ACTIVE').length;
    const compliantPM = Math.max(0, totalActivePM - kpiData.overdueMaintenance);
    const pmCompliance = totalActivePM > 0 ? Math.round((compliantPM / totalActivePM) * 100) : 100;

    return { mttr, pmCompliance, completedCount: completedWos.length };
  }, [scopedWorkOrders, scopedSchedules, kpiData.overdueMaintenance]);

  // Acknowledge Alert Handler
  const handleAcknowledgeAlert = async (alertId: number) => {
    setAcknowledgingId(alertId);
    try {
      await api.post(`/alerts/${alertId}/acknowledge`);
      toast.success(`Alert #${alertId} acknowledged successfully`);
      setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      toast.error('Failed to acknowledge alert');
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div className="flex flex-col w-full gap-5 pb-16 font-sans text-slate-800 antialiased">

      {/* ========================================================================= */}
      {/* 1. CLEAN CONTROL CENTER HEADER & MULTISELECT FILTER SUITE */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col gap-4">
        
        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs border border-emerald-100 shrink-0">
                <Wrench className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Maintenance Control Center</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Operations</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Supervisory control for plant assets, preventive routines, and equipment safety.
                </p>
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            
            {/* Live Clock & Refreshed Pill */}
            <div className="hidden sm:flex flex-col text-right px-3 py-1 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-mono font-bold text-slate-700">{currentTime}</span>
              <span className="text-[10px] text-slate-400">Refreshed at {lastRefreshedTime}</span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchCmmsData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-60"
              title="Refresh telemetry & maintenance records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {/* View All Work Orders */}
            <Link
              to="/work-orders"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-xs transition-all cursor-pointer"
            >
              <ClipboardList className="w-4 h-4 text-slate-600" />
              <span>View All Work Orders</span>
            </Link>

            {/* Create Work Order (GMARK Action Green - Clean Single Plus) */}
            <Link
              to="/work-orders/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Work Order</span>
            </Link>

          </div>
        </div>

        {/* Sub-Navigation Tabs & View Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSubTab('overview')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === 'overview'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CMMS Overview
            </button>
            <button
              type="button"
              onClick={() => setSubTab('analytics')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'analytics'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Maintenance Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('alerts')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'alerts'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Equipment Alerts</span>
              {kpiData.openScadaAlerts > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {kpiData.openScadaAlerts}
                </span>
              )}
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Telemetry Feed: <strong className={wsConnected ? 'text-emerald-600 font-bold' : 'text-slate-600 font-bold'}>
              {wsConnected ? 'Live Stream Connected' : 'Standard Polling'}
            </strong>
          </span>
        </div>

        {/* ========================================================================= */}
        {/* DEDICATED REAL MULTISELECT FILTER DROPDOWNS BAR */}
        {/* ========================================================================= */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/90 flex flex-col gap-3">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Filter Dropdowns Group */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span>Filter Scope:</span>
              </div>

              {/* 1. Main Facility Dropdown */}
              <div className="w-full sm:w-48">
                <MultiSelect
                  name="mainFacility"
                  placeholder="All Facilities..."
                  className="w-full text-xs"
                  values={selectedMainFacilityIds}
                  options={combinedMainOptions}
                  onChange={handleMainFacilityChange}
                />
              </div>

              {/* 2. Sub-Facility Dropdown */}
              <div className="w-full sm:w-48">
                <MultiSelect
                  name="subFacility"
                  placeholder="All Sub-Facilities..."
                  className="w-full text-xs"
                  values={selectedFacilityIds}
                  options={subFacilityOptions}
                  onChange={handleFacilityChange}
                />
              </div>

              {/* 3. Machine / Equipment Dropdown */}
              <div className="w-full sm:w-56">
                <MultiSelect
                  name="machine"
                  placeholder="All Equipment..."
                  className="w-full text-xs"
                  values={selectedMachineIds}
                  options={machineOptions}
                  onChange={handleMachineChange}
                />
              </div>
            </div>

            {/* Date Range Selector & Reset Button */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                {(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'CURRENT_YEAR', 'ALL'] as const).map(preset => {
                  const label = preset === 'TODAY' ? 'Today' :
                                preset === 'THIS_WEEK' ? 'Week' :
                                preset === 'THIS_MONTH' ? 'Month' :
                                preset === 'CURRENT_YEAR' ? 'Year' : 'All';
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDatePreset(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        datePreset === preset
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 cursor-pointer bg-white"
                  title="Reset all active filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

          </div>

          {/* Active Chips & Matching Summary Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active:</span>

              {/* Main Facility Chips */}
              {selectedMainFacilityIds.map(id => {
                const opt = combinedMainOptions.find(o => o.value === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[11px]">
                    <span>Facility: {opt?.label || id}</span>
                    <button type="button" onClick={() => setSelectedMainFacilityIds(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}

              {/* Sub-Facility Chips */}
              {selectedFacilityIds.map(id => {
                const opt = subFacilityOptions.find(o => o.value === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-medium text-[11px]">
                    <span>Sub: {opt?.label || id}</span>
                    <button type="button" onClick={() => setSelectedFacilityIds(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}

              {/* Machine Chips */}
              {selectedMachineIds.map(id => {
                const mac = machines.find(m => `m_${m.id}` === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-medium text-[11px]">
                    <span>Machine: {mac?.name || id}</span>
                    <button type="button" onClick={() => setSelectedMachineIds(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}

              {!hasActiveFilters && (
                <span className="text-slate-400 italic text-[11px]">All Authorized Plant Assets & Routines</span>
              )}
            </div>

            <span className="text-slate-500 font-medium ml-auto">
              Matching: <strong className="text-slate-800 font-mono font-bold">{scopedMachines.length}</strong> equipment • <strong className="text-slate-800 font-mono font-bold">{scopedWorkOrders.length}</strong> work orders
            </span>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. OPERATIONAL PLANT TRIAGE STATUS STRIP */}
      {/* ========================================================================= */}
      {kpiData.criticalWorkOrders > 0 || kpiData.openScadaAlerts > 0 ? (
        <div className="bg-rose-50/90 border-2 border-rose-300 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start md:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 shadow-xs">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-black text-rose-950 flex items-center gap-2">
                <span>Immediate Industrial Triage Required</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-900 uppercase tracking-wider">
                  Urgent Priority
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5 font-medium">
                {kpiData.criticalWorkOrders > 0 && `${kpiData.criticalWorkOrders} critical maintenance job(s) open`}
                {kpiData.criticalWorkOrders > 0 && kpiData.openScadaAlerts > 0 && ' • '}
                {kpiData.openScadaAlerts > 0 && `${kpiData.openScadaAlerts} unacknowledged equipment alert(s) detected`}
                . Immediate attention is required to avoid plant downtime and safety risks.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {kpiData.openScadaAlerts > 0 && (
              <button
                type="button"
                onClick={() => setSubTab('alerts')}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Review Alarms</span>
              </button>
            )}
            {kpiData.criticalWorkOrders > 0 && (
              <Link
                to="/work-orders?priority=CRITICAL"
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-100 text-rose-900 font-bold text-xs border border-rose-300 shadow-xs transition-all flex items-center gap-1"
              >
                <span>View Critical Jobs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      ) : kpiData.overdueMaintenance > 0 ? (
        <div className="bg-amber-50/90 border border-amber-300 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start md:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-amber-950 flex items-center gap-2">
                <span>Preventive Maintenance Notice</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 uppercase tracking-wider">
                  Schedule Overdue
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 font-medium">
                {kpiData.overdueMaintenance} scheduled preventive servicing routine(s) have exceeded their allowed post-plan tolerance window.
              </p>
            </div>
          </div>
          <Link
            to="/schedules"
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1 shrink-0"
          >
            <span>Review Overdue Routines</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="bg-emerald-50/90 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-950 block">All Monitored Equipment Running in Safe Operating Limits</span>
              <span className="text-[11px] text-emerald-700 font-medium">
                Zero critical breakdowns active • No unacknowledged alarms • {kpiData.onlineAssets} of {kpiData.totalAssets} machines transmitting live telemetry
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-white px-3 py-1 rounded-xl border border-emerald-200 shrink-0">
            Operational Normal
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. 8 HIGH-CONTRAST TABULAR KPI CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        
        {/* Total Assets */}
        <div 
          onClick={() => navigate('/machine-management')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 hover:border-emerald-500 shadow-2xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Machines</span>
            <Cpu className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-slate-900 mt-1">
            {kpiData.totalAssets}
          </div>
          <div className="text-[10.5px] font-mono font-semibold text-emerald-600 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{kpiData.onlineAssets} Online</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">{kpiData.offlineAssets} Off</span>
          </div>
        </div>

        {/* In Progress */}
        <div 
          onClick={() => navigate('/work-orders?status=IN_PROGRESS')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 hover:border-indigo-500 shadow-2xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>In Progress</span>
            <Wrench className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-indigo-600 mt-1">
            {kpiData.activeWorkOrders}
          </div>
          <div className="text-[10.5px] font-medium text-slate-400 mt-1">Active repair jobs</div>
        </div>

        {/* Waiting Approval */}
        <div 
          onClick={() => navigate('/work-orders?status=PENDING_APPROVAL')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 hover:border-amber-500 shadow-2xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Approvals</span>
            <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-amber-600 mt-1">
            {kpiData.pendingApprovals}
          </div>
          <div className="text-[10.5px] font-medium text-slate-400 mt-1">Triage & sign-off</div>
        </div>

        {/* Critical Jobs */}
        <div 
          onClick={() => navigate('/work-orders?priority=CRITICAL')}
          className={`p-3.5 rounded-xl border shadow-2xs transition-all cursor-pointer flex flex-col justify-between ${
            kpiData.criticalWorkOrders > 0 ? 'bg-rose-50/80 border-rose-300' : 'bg-white border-slate-200/90 hover:border-rose-400'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span className={kpiData.criticalWorkOrders > 0 ? 'text-rose-900 font-extrabold' : ''}>Critical Jobs</span>
            <AlertOctagon className={`w-3.5 h-3.5 ${kpiData.criticalWorkOrders > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight mt-1 ${kpiData.criticalWorkOrders > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {kpiData.criticalWorkOrders}
          </div>
          <div className="text-[10.5px] font-medium text-rose-600 mt-1">Urgent response</div>
        </div>

        {/* Overdue PM */}
        <div 
          onClick={() => navigate('/schedules')}
          className={`p-3.5 rounded-xl border shadow-2xs transition-all cursor-pointer flex flex-col justify-between ${
            kpiData.overdueMaintenance > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-white border-slate-200/90 hover:border-amber-400'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Overdue PM</span>
            <XCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500" />
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight mt-1 ${kpiData.overdueMaintenance > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {kpiData.overdueMaintenance}
          </div>
          <div className="text-[10.5px] font-medium text-red-600 mt-1">Past tolerance</div>
        </div>

        {/* Due Soon */}
        <div 
          onClick={() => navigate('/schedules')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 hover:border-purple-500 shadow-2xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Due in 30d</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-purple-600 mt-1">
            {kpiData.upcomingPM}
          </div>
          <div className="text-[10.5px] font-medium text-slate-400 mt-1">Scheduled service</div>
        </div>

        {/* Equipment Alerts */}
        <div 
          onClick={() => setSubTab('alerts')}
          className={`p-3.5 rounded-xl border shadow-2xs transition-all cursor-pointer flex flex-col justify-between ${
            kpiData.openScadaAlerts > 0 ? 'bg-rose-50/90 border-rose-300' : 'bg-white border-slate-200/90 hover:border-rose-400'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span className={kpiData.openScadaAlerts > 0 ? 'text-rose-900 font-extrabold' : ''}>Alarms</span>
            <ShieldAlert className={`w-3.5 h-3.5 ${kpiData.openScadaAlerts > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight mt-1 ${kpiData.openScadaAlerts > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {kpiData.openScadaAlerts}
          </div>
          <div className="text-[10.5px] font-medium text-rose-600 mt-1">Unacknowledged</div>
        </div>

        {/* Low Stock Spares */}
        <div 
          onClick={() => navigate('/spares')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 hover:border-amber-500 shadow-2xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Low Spares</span>
            <Package className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-amber-600 mt-1">
            {kpiData.lowStockCount}
          </div>
          <div className="text-[10.5px] font-medium text-slate-400 mt-1">Reorder needed</div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. CONTENT SECTIONS ACCORDING TO ACTIVE SUBTAB */}
      {/* ========================================================================= */}

      {/* SUBTAB 1: CMMS OVERVIEW */}
      {subTab === 'overview' && (
        <>
          {/* Visual Maintenance Workflow Diagram */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">How Maintenance Work Gets Completed</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Click any stage to filter work orders currently at that phase</p>
              </div>

              <Link to="/work-orders" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                Open Work Order Hub <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {pipelineStages.map((stage) => (
                <div
                  key={stage.id}
                  onClick={() => {
                    if (stage.statusFilter === 'ALL') navigate('/work-orders');
                    else navigate(`/work-orders?status=${stage.statusFilter}`);
                  }}
                  className={`p-3 rounded-xl border ${stage.color} hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold truncate">{stage.name}</span>
                    <span className="text-base font-black font-mono">{stage.count}</span>
                  </div>
                  {stage.hasPending && stage.count > 0 && (
                    <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      Pending Action
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Charts Row: Status Bar Chart & Priority Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Status Distribution */}
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Work Order Status Overview</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Jobs grouped by documented lifecycle stage</p>
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                    {scopedWorkOrders.length} Scoped Jobs
                  </span>
                </div>

                {scopedWorkOrders.length > 0 ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }} />
                        <Bar 
                          dataKey="count" 
                          radius={[6, 6, 0, 0]}
                          onClick={(entry) => entry?.key && navigate(`/work-orders?status=${entry.key}`)}
                          cursor="pointer"
                        >
                          {statusChartData.map((e, idx) => (
                            <Cell key={`bar-${idx}`} fill={e.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <ClipboardList className="w-8 h-8 text-slate-300 mb-1" />
                    <span className="font-bold text-slate-600">No work orders match the current filter</span>
                    <span className="text-[11px] text-slate-400">Try adjusting the facility, machine, or date range filters above</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 mt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400">In Execution:</span>
                  <strong className="block text-indigo-600 font-extrabold">{kpiData.activeWorkOrders} jobs</strong>
                </div>
                <div>
                  <span className="text-slate-400">Awaiting Decision:</span>
                  <strong className="block text-amber-600 font-extrabold">{kpiData.pendingApprovals} jobs</strong>
                </div>
                <div>
                  <span className="text-slate-400">Completed & Closed:</span>
                  <strong className="block text-emerald-600 font-extrabold">
                    {scopedWorkOrders.filter(w => w.status === 'COMPLETED' || w.status === 'CLOSED').length} jobs
                  </strong>
                </div>
              </div>
            </div>

            {/* Urgency Donut */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Maintenance Urgency</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Priority level breakdown</p>
                  </div>
                  <HelpTooltip text="Critical priority tasks take precedence over standard preventive maintenance." />
                </div>

                {priorityChartData.length > 0 ? (
                  <div className="h-44 w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                          onClick={(entry) => entry?.key && navigate(`/work-orders?priority=${entry.key}`)}
                          cursor="pointer"
                        >
                          {priorityChartData.map((entry, idx) => (
                            <Cell key={`pri-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black font-mono text-slate-900">{scopedWorkOrders.length}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 flex items-center justify-center text-xs text-slate-400">
                    No priority data for current scope
                  </div>
                )}
              </div>

              <div className="space-y-1 pt-3 border-t border-slate-100 text-xs">
                {priorityChartData.map(p => (
                  <div 
                    key={p.name}
                    onClick={() => navigate(`/work-orders?priority=${p.key}`)}
                    className="flex justify-between items-center p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-bold text-slate-700">{p.name}</span>
                    </div>
                    <strong className="font-mono text-slate-900">{p.value}</strong>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Equipment Fleet & Condition Monitor Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Equipment Fleet & Condition Monitor</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operating condition, fleet asset parameters, and connected IoT telemetry readings
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
                  {scopedMachines.length} Units In Scope
                </span>
                <Link to="/machine-management" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1">
                  Equipment Catalog →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scopedMachines.slice(0, 12).map(machine => {
                const hasDevice = !!machine.deviceId;
                const liveData = hasDevice ? (liveTelemetryMap[machine.deviceId] || {}) : {};
                const isOnline = (machine.status || 'Online').toLowerCase() === 'online';
                const ry = liveData.ryVoltage || liveData.voltageR;
                const currentR = liveData.currentR;
                const pressure = liveData.pressureBar;

                const facilityName = machine.facility?.facilityName || machine.building?.name || 'Main Plant';
                const assetIdentifier = machine.assetCode || machine.machineCode || `MCH-${String(machine.id).padStart(3, '0')}`;
                const makeModel = [machine.make, machine.modelNumber].filter(Boolean).join(' • ') || machine.machineType || 'Standard Machine';

                return (
                  <div key={machine.id} className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70">
                      <div>
                        <strong className="text-sm font-bold text-slate-900 block truncate" title={machine.name}>
                          {machine.name}
                        </strong>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                          <span className="font-semibold text-emerald-700">{assetIdentifier}</span>
                          {machine.machineCategory && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-200/70 rounded text-slate-600 font-sans">
                              {machine.machineCategory}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold border shrink-0 ${
                        hasDevice
                          ? (isOnline ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-200 text-slate-600 border-slate-300')
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {hasDevice ? (isOnline ? 'STREAMING' : 'STANDBY') : 'OPERATIONAL'}
                      </span>
                    </div>

                    {hasDevice ? (
                      /* Connected SCADA Telemetry Cards */
                      <div className="grid grid-cols-3 gap-2 text-center text-xs my-2 font-mono">
                        <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                          <span className="text-[10px] font-sans text-slate-400 block font-bold">Voltage</span>
                          <strong className="text-slate-800">{isOnline ? `${ry || 415}V` : '—'}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                          <span className="text-[10px] font-sans text-slate-400 block font-bold">Current</span>
                          <strong className="text-slate-800">{isOnline ? `${currentR || 12.4}A` : '—'}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                          <span className="text-[10px] font-sans text-slate-400 block font-bold">Pressure</span>
                          <strong className="text-emerald-700">{isOnline ? `${pressure || 4.2}b` : '—'}</strong>
                        </div>
                      </div>
                    ) : (
                      /* Standalone Industrial Asset Metadata Cards */
                      <div className="grid grid-cols-2 gap-2 text-xs my-2 font-mono">
                        <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                          <span className="text-[10px] font-sans text-slate-400 block font-bold">Make & Model</span>
                          <strong className="text-slate-800 truncate block text-[11px]" title={makeModel}>{makeModel}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                          <span className="text-[10px] font-sans text-slate-400 block font-bold">Location</span>
                          <strong className="text-slate-800 truncate block text-[11px]" title={facilityName}>{facilityName}</strong>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="truncate max-w-[140px]" title={facilityName}>
                        📍 {facilityName}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/work-orders/new?machineId=${machine.id}`}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          title="Raise Work Order for this machine"
                        >
                          + WO
                        </Link>
                        <Link
                          to="/machine-management"
                          className="text-slate-700 font-bold hover:text-emerald-600 flex items-center gap-0.5"
                        >
                          Details <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}

              {scopedMachines.length === 0 && (
                <div className="col-span-full py-12 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <strong className="text-slate-700 block text-sm">No Equipment In Active Scope</strong>
                  <p className="text-slate-400 mt-1 mb-3">Adjust your facility filters or reset to view all plant assets.</p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Issues Requiring Attention Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Issues Requiring Attention</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold font-mono">
                {scopedAlerts.length} Active Issues
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                    <th className="py-3 px-5">Severity Level</th>
                    <th className="py-3 px-5">Issue Description</th>
                    <th className="py-3 px-5">Device / Machine</th>
                    <th className="py-3 px-5">Time Detected</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {scopedAlerts.slice(0, 5).map(alert => (
                    <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                          alert.alertType === 'CRITICAL' || alert.type === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {alert.alertType || alert.type || 'WARNING'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-slate-900">{alert.message || 'Operating trip'}</td>
                      <td className="py-3.5 px-5 font-mono text-slate-500">{alert.deviceId}</td>
                      <td className="py-3.5 px-5 font-mono text-slate-500">{new Date(alert.createdAt).toLocaleString()}</td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/work-orders/new?problem=${encodeURIComponent(alert.message || 'Equipment Trip')}&priority=CRITICAL`}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                          >
                            Dispatch WO
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmAlert(alert)}
                            disabled={acknowledgingId === alert.id}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {scopedAlerts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                        <strong className="text-slate-700 block">All Systems Operational</strong>
                        <span>No active threshold trips or safety warnings</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active & Recent Work Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Active & Recent Work Orders</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Operational dispatch queue across scoped machines</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
                  {scopedWorkOrders.length} Scoped Jobs
                </span>
                <Link
                  to="/work-orders"
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                >
                  Work Order Hub <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                    <th className="py-3 px-5">WO Code</th>
                    <th className="py-3 px-5">Machine / Location</th>
                    <th className="py-3 px-5">Problem Description</th>
                    <th className="py-3 px-5">Priority</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Reported</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {scopedWorkOrders.slice(0, 6).map(wo => {
                    const priorityBadge =
                      wo.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                      wo.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                      wo.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      'bg-slate-100 text-slate-700 border-slate-200';

                    const statusBadge =
                      wo.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                      wo.status === 'APPROVED' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                      wo.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-900 border-indigo-200' :
                      wo.status === 'COMPLETED' || wo.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' :
                      wo.status === 'REJECTED' ? 'bg-rose-100 text-rose-900 border-rose-200' :
                      'bg-slate-100 text-slate-800 border-slate-200';

                    return (
                      <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                          <Link to="/work-orders" className="hover:text-emerald-600 hover:underline">
                            {wo.woNumber || `WO-${wo.id}`}
                          </Link>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="font-bold text-slate-900 block">{wo.machine?.name || `Machine #${wo.machineId}`}</span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {wo.machine?.machineCode || (wo.machine?.facility?.facilityName || 'Main Plant')}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 max-w-xs truncate text-slate-700 font-normal">
                          {wo.problemDescription || '—'}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${priorityBadge}`}>
                            {wo.priority || 'MEDIUM'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${statusBadge}`}>
                            {wo.status ? wo.status.replace(/_/g, ' ') : 'PENDING'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-500 text-[11px]">
                          {wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <Link
                            to="/work-orders"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs transition-colors inline-block"
                          >
                            Manage →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}

                  {scopedWorkOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                        <strong className="text-slate-700 block">No Active Work Orders</strong>
                        <span>No maintenance jobs currently open for the selected scope</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming PM & Spare Parts Availability Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Upcoming PM Schedule */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Upcoming Maintenance Schedule</h3>
                  </div>
                  <Link to="/schedules" className="text-xs font-bold text-purple-600 hover:underline">
                    View Schedules →
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {scopedSchedules.slice(0, 4).map(s => {
                    const date = s.nextRunDate ? new Date(s.nextRunDate) : s.startDate ? new Date(s.startDate) : null;
                    const dateStr = date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unscheduled';

                    return (
                      <div key={s.id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900 font-bold block">{s.machine?.name || 'Machine'}</strong>
                          <span className="font-mono text-[11px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                            {s.scheduleCode}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-2">Routine: {s.frequency}</span>
                        </div>
                        <div className="text-right font-mono">
                          <strong className="text-slate-800 block">{dateStr}</strong>
                          <span className="text-[10px] text-slate-400 font-sans">Tolerance: -{s.prePlanToleranceDays ?? 1}d / +{s.postPlanToleranceDays ?? 1}d</span>
                        </div>
                      </div>
                    );
                  })}

                  {scopedSchedules.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No preventive routines scheduled for active scope
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Spare Parts Inventory */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Spare Parts Availability</h3>
                  </div>
                  <Link to="/spares" className="text-xs font-bold text-emerald-600 hover:underline">
                    Inventory Master →
                  </Link>
                </div>

                <div className="space-y-2">
                  {spareParts.slice(0, 4).map(sp => {
                    const stock = sp.stockQuantity ?? 0;
                    const min = sp.minimumQuantity ?? 10;
                    const isLow = stock <= min;

                    return (
                      <div key={sp.id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900 font-bold block">{sp.partName}</strong>
                          <span className="font-mono text-[10.5px] text-slate-400">{sp.partCode} • {sp.location || 'Central Store'}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold block ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                            {stock} {sp.unitOfMeasure || 'PCS'}
                          </span>
                          <span className="text-[10px] text-slate-400">Min: {min}</span>
                        </div>
                      </div>
                    );
                  })}

                  {spareParts.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No spare parts recorded in inventory catalog
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </>
      )}

      {/* SUBTAB 2: MAINTENANCE ANALYTICS */}
      {subTab === 'analytics' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Mean Time to Repair</span>
              <strong className="text-3xl font-black font-mono text-slate-900 mt-1 block">{reliabilityMetrics.mttr} hrs</strong>
              <p className="text-slate-500 text-xs mt-1">Average elapsed restoration time</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">PM Schedule Compliance</span>
              <strong className="text-3xl font-black font-mono text-emerald-600 mt-1 block">{reliabilityMetrics.pmCompliance}%</strong>
              <p className="text-slate-500 text-xs mt-1">Completed within allowed tolerance</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Work Orders Resolved</span>
              <strong className="text-3xl font-black font-mono text-indigo-600 mt-1 block">{reliabilityMetrics.completedCount} jobs</strong>
              <p className="text-slate-500 text-xs mt-1">Closed or completed in scope</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Fleet Machines</span>
              <strong className="text-3xl font-black font-mono text-purple-600 mt-1 block">{scopedMachines.length} units</strong>
              <p className="text-slate-500 text-xs mt-1">Under supervisory maintenance</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight mb-4">Detailed Lifecycle Distribution</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((e, idx) => (
                      <Cell key={`analytics-bar-${idx}`} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: EQUIPMENT ALERTS CONSOLE */}
      {subTab === 'alerts' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Full SCADA Alarm Console</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Active sensor limit violations requiring mechanical verification</p>
            </div>

            <div className="flex items-center gap-2">
              {(['ALL', 'CRITICAL', 'WARNING'] as const).map(sev => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setAlertSeverityFilter(sev)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    alertSeverityFilter === sev ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-5">Severity</th>
                  <th className="py-3 px-5">Description</th>
                  <th className="py-3 px-5">Device</th>
                  <th className="py-3 px-5">Detected</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {scopedAlerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-200">
                        {alert.alertType || alert.type || 'CRITICAL'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-900">{alert.message || 'Setpoint trip'}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-500">{alert.deviceId}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-500">{new Date(alert.createdAt).toLocaleString()}</td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/work-orders/new?problem=${encodeURIComponent(alert.message || 'Equipment Trip')}&priority=CRITICAL`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                        >
                          Dispatch WO
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmAlert(alert)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs"
                        >
                          Acknowledge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {scopedAlerts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <strong>All Clear — Zero Active Alarms</strong>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. INDUSTRIAL SAFETY CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {confirmAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-950">Confirm Alarm Acknowledgment</h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  Ensure physical inspection is underway before clearing this alert from supervisory control.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Device ID:</span>
                  <strong className="text-slate-900">{confirmAlert.deviceId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Condition:</span>
                  <strong className="text-slate-900 font-sans">{confirmAlert.message || 'Operating trip'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Detected At:</span>
                  <span className="text-slate-700">{new Date(confirmAlert.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                Acknowledgment registers your user ID (<strong>{user?.username || 'Current User'}</strong>) in the permanent compliance audit log.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmAlert(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = confirmAlert.id;
                  setConfirmAlert(null);
                  handleAcknowledgeAlert(id);
                }}
                disabled={acknowledgingId === confirmAlert.id}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Log</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
