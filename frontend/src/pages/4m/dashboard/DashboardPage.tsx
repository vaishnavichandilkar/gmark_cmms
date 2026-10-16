import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Wrench, 
  Boxes, 
  RotateCcw, 
  Server, 
  Save, 
  Activity, 
  Cpu, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  FileText, 
  Package, 
  BarChart3, 
  ChevronRight, 
  Layers, 
  ShieldAlert, 
  ExternalLink,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  Target,
  Award,
  CheckSquare,
  FileCheck,
  Gauge,
  Zap,
  TrendingDown,
  Filter,
  SlidersHorizontal,
  ListChecks,
  UserCheck,
  Crosshair,
  AlertOctagon,
  PieChart,
  RefreshCw,
  Building2,
  Users,
  Briefcase,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { CustomSelect } from '../../../components/shared/CustomSelect';
import { MultiSelect } from '../../../components/shared/MultiSelect';
import { BoosterDashboard } from '../../scada/templates/booster/BoosterDashboard';
import { FirePanelDashboard } from '../../scada/templates/fire-panel/FirePanelDashboard';
import { api } from '../../../lib/api';
import type { RootState } from '../../../store';

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const getCurrentDateParts = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[now.getMonth()];
  const year = String(now.getFullYear());
  return { day, month, year };
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, buildingIds } = useSelector((state: RootState) => state.auth);

  // Tab State: 'iot' | 'cmms'
  const [activeTab, setActiveTab] = useState<'iot' | 'cmms'>(() => {
    if (user?.moduleAccess === 'CMMS') return 'cmms';
    return 'iot';
  });

  useEffect(() => {
    if (user?.moduleAccess === 'CMMS') {
      setActiveTab('cmms');
    } else if (user?.moduleAccess === 'IOT') {
      setActiveTab('iot');
    }
  }, [user?.moduleAccess]);

  // Scope Data States
  const [mainFacilities, setMainFacilities] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [societies, setSocieties] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  // Selection States
  const [selectedMainFacilityId, setSelectedMainFacilityId] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [activeMachineId, setActiveMachineId] = useState<string | null>(null);
  
  const [isTabsExpanded, setIsTabsExpanded] = useState(false);

  // CMMS Data States
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [cmmsLoading, setCmmsLoading] = useState<boolean>(false);

  // Enterprise CMMS Filter States (IATF 16949 Compliant Date Controls)
  const [filterDay, setFilterDay] = useState<string>(() => getCurrentDateParts().day);
  const [filterMonth, setFilterMonth] = useState<string>(() => getCurrentDateParts().month);
  const [filterYear, setFilterYear] = useState<string>(() => getCurrentDateParts().year);
  const [filterPreset, setFilterPreset] = useState<string>('THIS_MONTH');
  const [filterCriticality, setFilterCriticality] = useState<string>('ALL');
  const [filterMaintType, setFilterMaintType] = useState<string>('ALL');

  // Default selection logic
  const defaultSelectionKey = `dashboard_default_selection_${user?.id}`;
  const getSavedDefault = () => {
    try {
      const saved = localStorage.getItem(defaultSelectionKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };
  const [savedDefault, setSavedDefault] = useState<any>(getSavedDefault());
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);
  const [isMachineDropdownOpen, setIsMachineDropdownOpen] = useState(false);
  const [dismissedSelection, setDismissedSelection] = useState<string | null>(null);
  const hasInitialized = React.useRef(false);

  // Load Scope Data & CMMS Data
  useEffect(() => {
    setCmmsLoading(true);
    Promise.all([
      api.get('/main-facilities').catch(() => ({ data: [] })),
      api.get('/facilities').catch(() => ({ data: [] })),
      api.get('/societies').catch(() => ({ data: [] })),
      api.get('/buildings').catch(() => ({ data: [] })),
      api.get('/machines').catch(() => ({ data: [] })),
      api.get('/devices').catch(() => ({ data: [] })),
      api.get('/work-orders').catch(() => ({ data: [] })),
      api.get('/spare-parts').catch(() => ({ data: [] })),
      api.get('/schedules').catch(() => ({ data: [] })),
      api.get('/suppliers').catch(() => ({ data: [] })),
      api.get('/users').catch(() => ({ data: [] }))
    ]).then(([mfRes, fRes, sRes, bRes, mRes, dRes, woRes, spRes, schRes, supRes, empRes]) => {
      setMainFacilities(Array.isArray(mfRes.data) ? mfRes.data : []);
      setFacilities(Array.isArray(fRes.data) ? fRes.data : []);
      setSocieties(Array.isArray(sRes.data) ? sRes.data : []);
      setBuildings(Array.isArray(bRes.data) ? bRes.data : []);
      setMachines(Array.isArray(mRes.data) ? mRes.data : []);
      setDevices(Array.isArray(dRes.data) ? dRes.data : []);
      setWorkOrders(Array.isArray(woRes.data) ? woRes.data : []);
      setSpareParts(Array.isArray(spRes.data) ? spRes.data : []);
      setSchedules(Array.isArray(schRes.data) ? schRes.data : []);
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    }).catch(console.error).finally(() => setCmmsLoading(false));
  }, [user]);

  // Initialize IoT default selection once scope data loaded
  useEffect(() => {
    if (!hasInitialized.current && (machines.length > 0 || devices.length > 0 || facilities.length > 0)) {
      if (savedDefault) {
        const validAssets: string[] = [];
        savedDefault.machineIds?.forEach((id: string) => {
          if (id.startsWith('m_') && machines.find(m => m.id === Number(id.replace('m_','')))) validAssets.push(id);
          if (id.startsWith('d_') && devices.find(d => d.id === Number(id.replace('d_','')))) validAssets.push(id);
        });

        if (validAssets.length > 0) {
          hasInitialized.current = true;
          setSelectedMainFacilityId(savedDefault.mainFacilityId);
          setSelectedFacilityId(savedDefault.facilityId);
          setSelectedMachineIds(validAssets);
          return;
        }
      }

      if (user?.deviceId) {
        const targetMachine = machines.find(m => m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
        const targetDevice = devices.find(d => d.deviceId === user.deviceId || d.id?.toString() === user.deviceId);
        
        const targetFacId = targetMachine?.facilityId || user.facilityId;
        const targetFac = facilities.find(f => f.id === targetFacId);
        const targetMfId = targetFac?.mainFacilityId || user.mainFacilityId;

        if (targetMfId) setSelectedMainFacilityId(`mf_${targetMfId}`);
        if (targetFacId) setSelectedFacilityId(`f_${targetFacId}`);

        if (targetMachine) {
          setSelectedMachineIds([`m_${targetMachine.id}`]);
          hasInitialized.current = true;
          return;
        } else if (targetDevice) {
          setSelectedMachineIds([`d_${targetDevice.id}`]);
          hasInitialized.current = true;
          return;
        }
      }

      if (user?.facilityId) {
        const targetFacId = Number(user.facilityId);
        const targetFac = facilities.find(f => f.id === targetFacId);
        const targetMfId = targetFac?.mainFacilityId || user.mainFacilityId;

        if (targetMfId) setSelectedMainFacilityId(`mf_${targetMfId}`);
        setSelectedFacilityId(`f_${targetFacId}`);

        const facMachines = machines.filter(m => m.facilityId === targetFacId);
        if (facMachines.length > 0) {
          setSelectedMachineIds(facMachines.map(m => `m_${m.id}`));
        }
        hasInitialized.current = true;
        return;
      }

      if (user?.mainFacilityId) {
        const targetMfId = Number(user.mainFacilityId);
        setSelectedMainFacilityId(`mf_${targetMfId}`);

        const childFacs = facilities.filter(f => f.mainFacilityId === targetMfId);
        if (childFacs.length > 0) {
          setSelectedFacilityId(`f_${childFacs[0].id}`);
          const facMachines = machines.filter(m => m.facilityId === childFacs[0].id);
          if (facMachines.length > 0) {
            setSelectedMachineIds(facMachines.map(m => `m_${m.id}`));
          }
        }
        hasInitialized.current = true;
        return;
      }

      if (mainFacilities.length > 0) {
        const firstMf = mainFacilities[0];
        setSelectedMainFacilityId(`mf_${firstMf.id}`);
        const childFacs = facilities.filter(f => f.mainFacilityId === firstMf.id);
        if (childFacs.length > 0) {
          setSelectedFacilityId(`f_${childFacs[0].id}`);
          const facMachines = machines.filter(m => m.facilityId === childFacs[0].id);
          if (facMachines.length > 0) {
            setSelectedMachineIds(facMachines.map(m => `m_${m.id}`));
          }
        }
        hasInitialized.current = true;
      }
    }
  }, [machines, devices, facilities, mainFacilities, savedDefault, user]);

  // Prompt to save logic
  useEffect(() => {
    if (selectedMachineIds.length > 0 && selectedFacilityId && selectedMainFacilityId && !isMachineDropdownOpen) {
      const currentSelectionStr = JSON.stringify({
        mainFacilityId: selectedMainFacilityId,
        facilityId: selectedFacilityId,
        machineIds: [...selectedMachineIds].sort()
      });

      const isDifferentFromSaved = !savedDefault ||
        savedDefault.mainFacilityId !== selectedMainFacilityId ||
        savedDefault.facilityId !== selectedFacilityId ||
        JSON.stringify(savedDefault.machineIds.sort()) !== JSON.stringify([...selectedMachineIds].sort());

      const isNotDismissed = dismissedSelection !== currentSelectionStr;

      if (isDifferentFromSaved && isNotDismissed) {
        setShowDefaultPrompt(true);
      } else {
        setShowDefaultPrompt(false);
      }
    } else {
      setShowDefaultPrompt(false);
    }
  }, [selectedMachineIds, selectedFacilityId, selectedMainFacilityId, savedDefault, dismissedSelection, isMachineDropdownOpen]);

  const handleSaveDefault = () => {
    const newDefault = {
      mainFacilityId: selectedMainFacilityId,
      facilityId: selectedFacilityId,
      machineIds: selectedMachineIds
    };
    localStorage.setItem(defaultSelectionKey, JSON.stringify(newDefault));
    setSavedDefault(newDefault);
    setShowDefaultPrompt(false);
  };

  const handleDismissDefault = () => {
    const currentSelectionStr = JSON.stringify({
      mainFacilityId: selectedMainFacilityId,
      facilityId: selectedFacilityId,
      machineIds: [...selectedMachineIds].sort()
    });
    setDismissedSelection(currentSelectionStr);
    setShowDefaultPrompt(false);
  };

  useEffect(() => {
    if (selectedMachineIds.length > 0) {
      if (!activeMachineId || !selectedMachineIds.includes(activeMachineId)) {
        setActiveMachineId(selectedMachineIds[0]);
      }
    } else {
      setActiveMachineId(null);
    }
  }, [selectedMachineIds]);

  const visibleMainFacilities = useMemo(() => {
    if (user?.role === 'SUPER_ADMIN') return mainFacilities;
    if (user?.deviceId) {
      const targetMachine = machines.find(m => m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
      const targetFacId = targetMachine?.facilityId || user.facilityId;
      const targetFac = facilities.find(f => f.id === targetFacId);
      const targetMfId = targetFac?.mainFacilityId || user.mainFacilityId;
      if (targetMfId) return mainFacilities.filter(mf => mf.id === targetMfId);
      return mainFacilities;
    }
    if (user?.facilityId) {
      const targetFac = facilities.find(f => f.id === Number(user.facilityId));
      const targetMfId = targetFac?.mainFacilityId || user.mainFacilityId;
      if (targetMfId) return mainFacilities.filter(mf => mf.id === targetMfId);
      return mainFacilities;
    }
    if (user?.mainFacilityId) return mainFacilities.filter(mf => mf.id === user.mainFacilityId);
    if (user?.societyId || (buildingIds && buildingIds.length > 0)) return [];
    return mainFacilities;
  }, [mainFacilities, facilities, machines, user, buildingIds]);

  const visibleSocieties = useMemo(() => {
    if (user?.role === 'SUPER_ADMIN') return societies;
    if (user?.mainFacilityId || user?.facilityId || user?.deviceId) return [];
    if (user?.societyId) return societies.filter(s => s.id === user.societyId);
    if (buildingIds && buildingIds.length > 0) {
      const allowedSocIds = new Set(buildings.filter(b => buildingIds.includes(b.id)).map(b => b.societyId));
      return societies.filter(s => allowedSocIds.has(s.id));
    }
    return societies;
  }, [societies, buildings, user, buildingIds]);

  const visibleFacilities = useMemo(() => {
    if (user?.role === 'SUPER_ADMIN') return facilities;
    if (user?.deviceId) {
      const targetMachine = machines.find(m => m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
      const targetFacId = targetMachine?.facilityId || user.facilityId;
      if (targetFacId) return facilities.filter(f => f.id === targetFacId);
      return facilities;
    }
    if (user?.facilityId) {
      const targetFacId = Number(user.facilityId);
      const allowedFacilityIds = new Set<number>([targetFacId]);
      let added = true;
      while (added) {
        added = false;
        facilities.forEach((f: any) => {
          if (f.parentFacilityId && allowedFacilityIds.has(f.parentFacilityId) && !allowedFacilityIds.has(f.id)) {
            allowedFacilityIds.add(f.id);
            added = true;
          }
        });
      }
      return facilities.filter(f => allowedFacilityIds.has(f.id));
    }
    if (user?.mainFacilityId) return facilities.filter(f => f.mainFacilityId === user.mainFacilityId);
    return facilities;
  }, [facilities, machines, user]);

  const visibleBuildings = useMemo(() => {
    if (user?.role === 'SUPER_ADMIN') return buildings;
    if (user?.societyId) return buildings.filter(b => b.societyId === user.societyId);
    if (buildingIds && buildingIds.length > 0) return buildings.filter(b => buildingIds.includes(b.id));
    return buildings;
  }, [buildings, user, buildingIds]);

  const combinedMainOptions = useMemo(() => {
    return [
      ...visibleMainFacilities.map(mf => ({ label: mf.mainFacilityName, value: `mf_${mf.id}` })),
      ...visibleSocieties.map(s => ({ label: s.name, value: `soc_${s.id}` }))
    ];
  }, [visibleMainFacilities, visibleSocieties]);

  const combinedSubOptions = useMemo(() => {
    if (!selectedMainFacilityId) return [];
    if (selectedMainFacilityId.startsWith('mf_')) {
      const mfId = Number(selectedMainFacilityId.replace('mf_', ''));
      return visibleFacilities.filter(f => f.mainFacilityId === mfId).map(f => ({ label: f.facilityName, value: `f_${f.id}` }));
    }
    if (selectedMainFacilityId.startsWith('soc_')) {
      const socId = Number(selectedMainFacilityId.replace('soc_', ''));
      return visibleBuildings.filter(b => b.societyId === socId).map(b => ({ label: b.name, value: `b_${b.id}` }));
    }
    return [];
  }, [selectedMainFacilityId, visibleFacilities, visibleBuildings]);

  const filteredMachines = useMemo(() => {
    let result: any[] = [];
    if (!selectedFacilityId) return [];
    if (selectedFacilityId.startsWith('f_')) {
      const fId = Number(selectedFacilityId.replace('f_', ''));
      result = machines.filter(m => m.facilityId === fId).map(m => ({ ...m, uniqueId: `m_${m.id}` }));
    } else if (selectedFacilityId.startsWith('b_')) {
      const bId = Number(selectedFacilityId.replace('b_', ''));
      const bldgMachines = machines.filter(m => m.buildingId === bId).map(m => ({ ...m, uniqueId: `m_${m.id}` }));
      const bldgDevices = devices.filter(d => d.buildingId === bId).map(d => ({ ...d, uniqueId: `d_${d.id}` }));
      result = [...bldgMachines, ...bldgDevices];
    }

    if (user?.deviceId) {
      result = result.filter(m => m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
    }
    return result;
  }, [selectedFacilityId, machines, devices, user]);

  const getMachinesForFacility = (facIdStr: string | null) => {
    if (!facIdStr) return [];
    let result: string[] = [];
    if (facIdStr.startsWith('f_')) {
      const fId = Number(facIdStr.replace('f_', ''));
      result = machines.filter(m => m.facilityId === fId).map(m => `m_${m.id}`);
    } else if (facIdStr.startsWith('b_')) {
      const bId = Number(facIdStr.replace('b_', ''));
      const bldgMachines = machines.filter(m => m.buildingId === bId).map(m => `m_${m.id}`);
      const bldgDevices = devices.filter(d => d.buildingId === bId).map(d => `d_${d.id}`);
      result = [...bldgMachines, ...bldgDevices];
    }
    if (user?.deviceId) {
      result = result.filter(uId => {
        if (uId.startsWith('m_')) {
          const m = machines.find(mac => mac.id === Number(uId.replace('m_', '')));
          return m && (m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
        }
        if (uId.startsWith('d_')) {
          const d = devices.find(dev => dev.id === Number(uId.replace('d_', '')));
          return d && (d.deviceId === user.deviceId || d.id?.toString() === user.deviceId);
        }
        return false;
      });
    }
    return result;
  };
  
  const getAssetDetails = (uniqueId: string) => {
    if (uniqueId.startsWith('m_')) {
      const m = machines.find(m => m.id === Number(uniqueId.replace('m_', '')));
      return m ? { ...m, uniqueId } : null;
    }
    if (uniqueId.startsWith('d_')) {
      const d = devices.find(d => d.id === Number(uniqueId.replace('d_', '')));
      return d ? { ...d, uniqueId } : null;
    }
    return null;
  };

  // Filter Work Orders based on active CMMS filters (Preset Date, Day, Month, Year, Criticality, Strategy)
  const filteredWorkOrders = useMemo(() => {
    const monthIndex = MONTH_NAMES.indexOf(filterMonth);
    const yearNum = Number(filterYear);
    const dayNum = Number(filterDay);

    return workOrders.filter(wo => {
      // 1. Criticality Filter
      if (filterCriticality !== 'ALL') {
        const p = (wo.priority || '').toUpperCase();
        if (filterCriticality === 'A' && p !== 'CRITICAL' && p !== 'HIGH') return false;
        if (filterCriticality === 'B' && p !== 'MEDIUM') return false;
        if (filterCriticality === 'C' && p !== 'LOW') return false;
      }

      // 2. Maintenance Strategy Filter
      if (filterMaintType !== 'ALL') {
        const cat = (wo.maintenanceCategory || wo.triggerType || '').toUpperCase();
        if (filterMaintType === 'PREVENTIVE' && !cat.includes('SCHEDULE') && !cat.includes('PREVENT')) return false;
        if (filterMaintType === 'BREAKDOWN' && !cat.includes('MANUAL') && !cat.includes('BREAK') && !cat.includes('MACHINE')) return false;
        if (filterMaintType === 'PREDICTIVE' && !cat.includes('PREDICT')) return false;
        if (filterMaintType === 'AUTONOMOUS' && !cat.includes('AUTO')) return false;
      }

      // 3. Date Range / Preset Filter
      const rawDateStr = wo.createdAt || wo.estimatedStartDate || wo.updatedAt;
      if (!rawDateStr) return true;
      const d = new Date(rawDateStr);
      if (isNaN(d.getTime())) return true;

      if (filterPreset === 'TODAY') {
        return d.getFullYear() === yearNum && d.getMonth() === monthIndex && d.getDate() === dayNum;
      } else if (filterPreset === 'THIS_WEEK') {
        const targetDate = new Date(yearNum, monthIndex, dayNum);
        const dayOfWeek = targetDate.getDay();
        const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const startOfWeek = new Date(targetDate);
        startOfWeek.setDate(targetDate.getDate() + diffToMon);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return d >= startOfWeek && d <= endOfWeek;
      } else if (filterPreset === 'THIS_MONTH') {
        return d.getFullYear() === yearNum && d.getMonth() === monthIndex;
      } else if (filterPreset === 'CURRENT_YEAR') {
        return d.getFullYear() === yearNum;
      } else if (filterPreset === 'CUSTOM') {
        return d.getFullYear() === yearNum && d.getMonth() === monthIndex && d.getDate() === dayNum;
      }

      return true;
    });
  }, [workOrders, filterPreset, filterDay, filterMonth, filterYear, filterCriticality, filterMaintType]);

  // Enterprise CMMS Metrics Computation (TPM & IATF 16949 Standards)
  const cmmsMetrics = useMemo(() => {
    const totalWO = filteredWorkOrders.length;
    const pendingApproval = filteredWorkOrders.filter(w => w.status === 'PENDING_APPROVAL').length;
    const approved = filteredWorkOrders.filter(w => w.status === 'APPROVED').length;
    const inProgress = filteredWorkOrders.filter(w => w.status === 'IN_PROGRESS').length;
    const revisionRequested = filteredWorkOrders.filter(w => w.status === 'REVISION_REQUESTED').length;
    const completed = filteredWorkOrders.filter(w => w.status === 'COMPLETED').length;
    const closed = filteredWorkOrders.filter(w => w.status === 'CLOSED').length;
    const rejected = filteredWorkOrders.filter(w => w.status === 'REJECTED').length;

    const criticalWO = filteredWorkOrders.filter(w => w.priority === 'CRITICAL' && w.status !== 'CLOSED' && w.status !== 'REJECTED').length;
    const highWO = filteredWorkOrders.filter(w => w.priority === 'HIGH' && w.status !== 'CLOSED' && w.status !== 'REJECTED').length;

    const totalMachines = machines.length;

    const totalSpares = spareParts.length;
    const lowStockSpares = spareParts.filter(s => (s.stockQuantity ?? 0) <= 20);

    const totalSchedules = schedules.length;
    const activeSchedules = schedules.filter(s => s.status === 'ACTIVE').length;

    const totalSuppliers = suppliers.length;
    const totalEmployees = employees.length;

    // Calculate breakdown work orders and loss hours dynamically
    const breakdownWOs = filteredWorkOrders.filter(w => 
      w.maintenanceCategory === 'BREAKDOWN' || 
      w.triggerType === 'MACHINE_CARD' || 
      w.triggerType === 'MANUAL'
    );
    const breakdownCategoryWO = breakdownWOs.length;

    const breakdownDowntimeHours = breakdownWOs.reduce((sum, w) => {
      const h = parseFloat(w.estimatedHours) || parseFloat(w.actualHours) || 0;
      return sum + h;
    }, 0);

    // TPM Six Big Losses Distribution (Computed dynamically)
    const sixBigLosses = [
      { name: 'Equipment Failure (Breakdowns)', pct: breakdownDowntimeHours > 0 ? 100 : 0, hours: `${breakdownDowntimeHours.toFixed(1)} hrs`, color: 'bg-red-500' },
      { name: 'Setup & Adjustment', pct: 0, hours: '0.0 hrs', color: 'bg-amber-500' },
      { name: 'Idling & Minor Stops', pct: 0, hours: '0.0 hrs', color: 'bg-orange-500' },
      { name: 'Reduced Speed', pct: 0, hours: '0.0 hrs', color: 'bg-yellow-500' },
      { name: 'Process Defects & Rework', pct: 0, hours: '0.0 hrs', color: 'bg-cyan-500' },
      { name: 'Reduced Yield / Scrap', pct: 0, hours: '0.0 hrs', color: 'bg-blue-500' },
    ];

    // TPM 6 Pillars Operational Status (Computed dynamically)
    const totalScheds = schedules.length;
    const activeScheds = schedules.filter(s => s.status === 'ACTIVE').length;
    const pmPct = totalScheds > 0 ? Math.round((activeScheds / totalScheds) * 100) : 0;

    const totalWOCount = filteredWorkOrders.length;
    const completedWOCount = filteredWorkOrders.filter(w => w.status === 'COMPLETED' || w.status === 'CLOSED').length;
    const qualityPct = totalWOCount > 0 ? Math.round((completedWOCount / totalWOCount) * 100) : 0;

    const resolvedBDCount = breakdownWOs.filter(w => w.status === 'COMPLETED' || w.status === 'CLOSED').length;
    const kaizenPct = breakdownCategoryWO > 0 ? Math.round((resolvedBDCount / breakdownCategoryWO) * 100) : 0;

    const totalMacs = machines.length;
    const activeMacs = machines.filter(m => m.status === 'ACTIVE' || m.status === 'Active' || !m.status).length;
    const eemPct = totalMacs > 0 ? Math.round((activeMacs / totalMacs) * 100) : 0;

    const totalEmps = employees.length;
    const activeEmps = employees.filter(e => e.isActive !== false).length;
    const skillPct = totalEmps > 0 ? Math.round((activeEmps / totalEmps) * 100) : 0;

    const tpmPillars = [
      { id: 1, name: 'Autonomous Maintenance (Jishu Hozen)', status: pmPct > 0 ? 'ACTIVE' : 'INACTIVE', progress: pmPct, lead: 'Operator CLIT Routines' },
      { id: 2, name: 'Planned Maintenance (Kobetsu Hozen)', status: pmPct > 0 ? 'ACTIVE' : 'INACTIVE', progress: pmPct, lead: 'PM & PDM Strategy' },
      { id: 3, name: 'Quality Maintenance (Hinshitsu Hozen)', status: qualityPct > 0 ? 'ON TRACK' : 'INACTIVE', progress: qualityPct, lead: 'Zero-Defect Condition' },
      { id: 4, name: 'Focused Improvement (Kaizen)', status: kaizenPct > 0 ? 'IN PROGRESS' : 'INACTIVE', progress: kaizenPct, lead: '5-Why & Loss Reduction' },
      { id: 5, name: 'Early Equipment Management', status: eemPct > 0 ? 'ACTIVE' : 'INACTIVE', progress: eemPct, lead: 'Installation & FMEA' },
      { id: 6, name: 'Training & Skill Matrix', status: skillPct > 0 ? 'ON TRACK' : 'INACTIVE', progress: skillPct, lead: 'Technician Certifications' },
    ];

    // Bad Actor Equipment Reliability Ranking (Computed dynamically from real work orders)
    const machineMap: Record<number, { machine: any; failures: number; downtimeMinutes: number; cost: number }> = {};
    filteredWorkOrders.forEach(wo => {
      if (wo.machineId) {
        const mac = machines.find(m => m.id === wo.machineId) || wo.machine;
        if (mac) {
          if (!machineMap[wo.machineId]) {
            machineMap[wo.machineId] = { machine: mac, failures: 0, downtimeMinutes: 0, cost: 0 };
          }
          machineMap[wo.machineId].failures += 1;
          const h = parseFloat(wo.estimatedHours) || parseFloat(wo.actualHours) || 1.5;
          machineMap[wo.machineId].downtimeMinutes += h * 60;
          const c = parseFloat(wo.cost) || parseFloat(wo.totalCost) || 0;
          machineMap[wo.machineId].cost += c;
        }
      }
    });

    const badActors = Object.values(machineMap)
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 5)
      .map((item, idx) => {
        const hrs = (item.downtimeMinutes / 60).toFixed(1);
        const avgMttrMins = Math.round(item.downtimeMinutes / (item.failures || 1));
        return {
          id: item.machine.id,
          code: item.machine.code || item.machine.machineCode || `EQ-0${item.machine.id}`,
          name: item.machine.name,
          criticality: item.machine.criticality || (idx === 0 ? 'A — Critical' : 'B — Important'),
          criticalityClass: idx === 0 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200',
          failures: item.failures,
          downtime: `${hrs} hrs`,
          mttr: `${avgMttrMins} mins`,
          cost: item.cost > 0 ? `₹${item.cost.toLocaleString('en-IN')}` : '₹0',
          repeat: item.failures > 1,
          rcaStatus: item.failures > 2 ? '5-Why In Progress' : item.failures > 1 ? 'CAPA Verified' : 'Monitored'
        };
      });

    return {
      totalWO,
      pendingApproval,
      approved,
      inProgress,
      revisionRequested,
      completed,
      closed,
      rejected,
      criticalWO,
      highWO,
      totalMachines,
      breakdownCategoryWO,
      totalSpares,
      lowStockSpares,
      totalSchedules,
      activeSchedules,
      totalSuppliers,
      totalEmployees,
      breakdownDowntimeHours: breakdownDowntimeHours.toFixed(1),
      sixBigLosses,
      tpmPillars,
      badActors
    };
  }, [filteredWorkOrders, machines, spareParts, schedules, suppliers, employees]);

  return (
    <div className="flex flex-col w-full mx-auto min-h-full font-sans">

      {/* Header & Centered Tab Switcher Bar */}
      <div className="relative z-50 flex flex-col md:flex-row items-center justify-center gap-4 mb-6 pt-2">
        
        {/* Centered Standalone Tab Switcher Buttons */}
        <div className="flex items-center gap-3">
          {(user?.moduleAccess === 'BOTH' || user?.moduleAccess === 'IOT' || !user?.moduleAccess) && (
            <button
              type="button"
              onClick={() => setActiveTab('iot')}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-extrabold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === 'iot'
                  ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-xs'
              }`}
            >
              <Cpu className={`w-4 h-4 ${activeTab === 'iot' ? 'text-white' : 'text-slate-500'}`} />
              <span>IoT Dashboard</span>
            </button>
          )}

          {(user?.moduleAccess === 'BOTH' || user?.moduleAccess === 'CMMS' || !user?.moduleAccess) && (
            <button
              type="button"
              onClick={() => setActiveTab('cmms')}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-extrabold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === 'cmms'
                  ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-xs'
              }`}
            >
              <Wrench className={`w-4 h-4 ${activeTab === 'cmms' ? 'text-white' : 'text-slate-500'}`} />
              <span>CMMS Dashboard</span>
            </button>
          )}
        </div>

        {/* Live Status Indicator */}
        <div className="md:absolute md:right-0 flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <span>Active: {activeTab === 'iot' ? 'IoT SCADA Telemetry' : 'CMMS Maintenance'}</span>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* TAB 1: IOT DASHBOARD VIEW */}
      {/* ========================================================================================= */}
      {activeTab === 'iot' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col w-full"
        >
          {/* Sticky Header Section */}
          <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md pt-4 pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 border-b border-gray-100 mb-8 shadow-xs">
            {/* Top Bar for Asset Selection */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Boxes size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Select Asset</h2>
                  <p className="text-xs text-gray-500 font-medium">Choose a machine to view its live dashboard</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                <CustomSelect
                  name="mainFacility"
                  placeholder="Facility..."
                  className="w-full md:w-48"
                  value={selectedMainFacilityId || ''}
                  options={combinedMainOptions}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setSelectedMainFacilityId(val);
                    if (!val) {
                      setSelectedFacilityId(null);
                      setSelectedMachineIds([]);
                      return;
                    }
                    let subOpts: string[] = [];
                    if (val.startsWith('mf_')) {
                      const mfId = Number(val.replace('mf_', ''));
                      subOpts = visibleFacilities.filter(f => f.mainFacilityId === mfId).map(f => `f_${f.id}`);
                    } else if (val.startsWith('soc_')) {
                      const socId = Number(val.replace('soc_', ''));
                      subOpts = visibleBuildings.filter(b => b.societyId === socId).map(b => `b_${b.id}`);
                    }

                    if (subOpts.length > 0) {
                      const firstSub = subOpts[0];
                      setSelectedFacilityId(firstSub);
                      const allMacs = getMachinesForFacility(firstSub);
                      setSelectedMachineIds(allMacs);
                    } else {
                      setSelectedFacilityId(null);
                      setSelectedMachineIds([]);
                    }
                  }}
                />

                <CustomSelect
                  name="facility"
                  placeholder="Sub-Facility..."
                  className="w-full md:w-48"
                  disabled={!selectedMainFacilityId}
                  value={selectedFacilityId || ''}
                  options={combinedSubOptions}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setSelectedFacilityId(val);
                    if (val) {
                      const allMacs = getMachinesForFacility(val);
                      setSelectedMachineIds(allMacs);
                    } else {
                      setSelectedMachineIds([]);
                    }
                  }}
                />

                <MultiSelect
                  name="machine"
                  placeholder="Machines..."
                  className="w-full md:w-64"
                  disabled={!selectedFacilityId}
                  values={selectedMachineIds}
                  options={filteredMachines.map(m => ({ label: m.name, value: m.uniqueId }))}
                  onChange={(selectedValues) => {
                    setSelectedMachineIds(selectedValues);
                  }}
                  onToggle={(isOpen) => {
                    setIsMachineDropdownOpen(isOpen);
                  }}
                />

                {(selectedMainFacilityId || selectedFacilityId || selectedMachineIds.length > 0) && (
                  <button
                    onClick={() => {
                      setSelectedMainFacilityId(null);
                      setSelectedFacilityId(null);
                      setSelectedMachineIds([]);
                      setSavedDefault(null);
                      localStorage.removeItem(defaultSelectionKey);
                    }}
                    className="p-2 md:p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 flex items-center justify-center cursor-pointer"
                    title="Reset Filters"
                  >
                    <RotateCcw size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Navigation Icons */}
            {selectedMachineIds.length > 1 && (
              <div className="px-2 w-full">
                <div className="flex flex-wrap gap-4 items-center">
                  {(isTabsExpanded ? selectedMachineIds : selectedMachineIds.slice(0, 3)).map(mId => {
                    const machine = getAssetDetails(mId);
                    if (!machine) return null;
                    const isActive = activeMachineId === mId;
                    return (
                      <button
                        key={mId}
                        onClick={() => {
                          setActiveMachineId(mId);
                          document.getElementById(`dashboard-${mId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer ${isActive
                            ? 'bg-blue-600 text-white border border-blue-600 shadow-blue-500/20'
                            : 'bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                          }`}
                      >
                        <Server size={18} className={isActive ? 'text-blue-100' : 'text-gray-400'} />
                        <span className="truncate max-w-[200px]">{machine.name}</span>
                      </button>
                    );
                  })}
                  
                  {selectedMachineIds.length > 3 && (
                    <button
                      onClick={() => setIsTabsExpanded(!isTabsExpanded)}
                      className="flex items-center whitespace-nowrap gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-xs cursor-pointer"
                    >
                      {isTabsExpanded ? (
                        <>Show Less</>
                      ) : (
                        <>+ {selectedMachineIds.length - 3} More</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedMachineIds.length > 0 ? (
            <div className="flex-1 mt-2 flex flex-col gap-4">
              <div className="flex flex-col gap-10 w-full pb-12">
                {selectedMachineIds.map(mId => {
                  const machine = getAssetDetails(mId);
                  if (!machine) return null;
                  
                  let buildingName = machine.name;
                  if (machine.facilityId) {
                    const facility = facilities.find(fac => fac.id === machine.facilityId);
                    if (facility) buildingName = facility.facilityName;
                  } else if (machine.buildingId) {
                    const building = buildings.find(b => b.id === machine.buildingId);
                    if (building) buildingName = building.name;
                  }
                  
                  const isFirePanel = machine.template === 'fire-panel' || (machine.deviceId && devices.find(d => d.deviceId === machine.deviceId)?.template === 'fire-panel');

                  return (
                    <div 
                      key={machine.uniqueId} 
                      id={`dashboard-${machine.uniqueId}`}
                      className="scroll-mt-64 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden w-full flex-shrink-0 relative"
                      style={{ minHeight: '800px' }}
                    >
                      {isFirePanel ? (
                        <FirePanelDashboard
                          title={machine.name}
                          panelId={machine.deviceId}
                          buildingName={buildingName}
                        />
                      ) : (
                        <BoosterDashboard
                          title={machine.name}
                          panelId={machine.deviceId}
                          buildingName={buildingName}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 mt-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative overflow-hidden text-center max-w-lg w-full bg-white/80 backdrop-blur-xl p-12 rounded-[2rem] border border-white/60 shadow-[0_20px_60px_-15px_rgba(0,166,81,0.15)] group hover:shadow-[0_20px_60px_-15px_rgba(0,166,81,0.25)] transition-all duration-500"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-blue-50/80 to-transparent pointer-events-none rounded-[2rem]" />
                
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="relative w-28 h-28 mx-auto mb-8"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-blue-600/5 rounded-3xl rotate-6 group-hover:rotate-12 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-white rounded-3xl -rotate-3 group-hover:-rotate-6 transition-transform duration-500 shadow-xl shadow-blue-500/10 border border-blue-50 flex items-center justify-center backdrop-blur-sm">
                    <Boxes size={44} strokeWidth={1.5} className="text-blue-600" />
                  </div>
                </motion.div>
                
                <div className="relative">
                  <h1 className="text-3xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    System Overview
                  </h1>
                  <p className="text-[1.05rem] text-gray-500 leading-relaxed font-medium">
                    Select one or more assets from the top menu to monitor their real-time <span className="text-gray-700 font-semibold">SCADA metrics</span>.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 2: ENTERPRISE TPM & IATF 16949 CMMS DASHBOARD VIEW */}
      {/* ========================================================================================= */}
      {activeTab === 'cmms' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col w-full gap-8 pb-16"
        >
          {/* IATF 16949 Compliant Global Filter & Date Control Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Filter Title & Quick Ranges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm border-r border-slate-200 pr-3">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span>CMMS Filters</span>
              </div>

              {/* Preset Range Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'TODAY', label: 'Today' },
                  { id: 'THIS_WEEK', label: 'This Week' },
                  { id: 'THIS_MONTH', label: 'This Month' },
                  { id: 'CURRENT_YEAR', label: 'Current Year' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setFilterPreset(preset.id);
                      const curr = getCurrentDateParts();
                      if (preset.id === 'TODAY') {
                        setFilterDay(curr.day);
                        setFilterMonth(curr.month);
                        setFilterYear(curr.year);
                      } else if (preset.id === 'THIS_WEEK') {
                        setFilterDay(curr.day);
                        setFilterMonth(curr.month);
                        setFilterYear(curr.year);
                      } else if (preset.id === 'THIS_MONTH') {
                        setFilterMonth(curr.month);
                        setFilterYear(curr.year);
                      } else if (preset.id === 'CURRENT_YEAR') {
                        setFilterYear(curr.year);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterPreset === preset.id
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Separate Date Controls (Day, Month, Year) & Scope Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Separate Day / Month / Year Dropdowns */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-2">Date</span>
                
                {/* Day Select */}
                <select
                  value={filterDay}
                  onChange={(e) => { setFilterDay(e.target.value); setFilterPreset('CUSTOM'); }}
                  className="bg-white text-slate-800 text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => {
                    const d = (i + 1).toString().padStart(2, '0');
                    return <option key={d} value={d}>{d}</option>;
                  })}
                </select>

                {/* Month Select */}
                <select
                  value={filterMonth}
                  onChange={(e) => { setFilterMonth(e.target.value); setFilterPreset('CUSTOM'); }}
                  className="bg-white text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {/* Year Select */}
                <select
                  value={filterYear}
                  onChange={(e) => { setFilterYear(e.target.value); setFilterPreset('CUSTOM'); }}
                  className="bg-white text-slate-800 text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {['2024', '2025', '2026', '2027'].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Criticality Filter */}
              <select
                value={filterCriticality}
                onChange={(e) => setFilterCriticality(e.target.value)}
                className="bg-slate-50 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Criticality</option>
                <option value="A">Class A — Critical</option>
                <option value="B">Class B — Important</option>
                <option value="C">Class C — General</option>
              </select>

              {/* Maintenance Strategy Filter */}
              <select
                value={filterMaintType}
                onChange={(e) => setFilterMaintType(e.target.value)}
                className="bg-slate-50 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Strategies</option>
                <option value="PREVENTIVE">Preventive (PM)</option>
                <option value="BREAKDOWN">Breakdown (BD)</option>
                <option value="PREDICTIVE">Predictive (PdM)</option>
                <option value="AUTONOMOUS">Autonomous (AM)</option>
              </select>
            </div>
          </div>

          {/* Section: My System Modules Overview */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">My Modules Operational Hub</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Real-time status across active system modules</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Module 1: Work Orders */}
              <Link to="/work-orders" className="bg-slate-50/70 hover:bg-blue-50/40 p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-700 group-hover:text-blue-700">Work Orders</span>
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">{cmmsMetrics.totalWO} Active WOs</div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600">
                  <span>{cmmsMetrics.pendingApproval} Pending</span>
                  <span>•</span>
                  <span className="text-blue-600">{cmmsMetrics.inProgress} In Progress</span>
                </div>
              </Link>

              {/* Module 2: Schedule Maintenance */}
              <Link to="/schedules" className="bg-slate-50/70 hover:bg-blue-50/40 p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-700 group-hover:text-blue-700">Schedule Maintenance</span>
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">{cmmsMetrics.totalSchedules} PM Policies</div>
                <div className="text-[11px] font-bold text-purple-600">
                  {cmmsMetrics.activeSchedules} Active Policies
                </div>
              </Link>

              {/* Module 3: Spares Management */}
              <Link to="/spares" className="bg-slate-50/70 hover:bg-blue-50/40 p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-700 group-hover:text-blue-700">Spares Management</span>
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">{cmmsMetrics.totalSpares} Inventory Items</div>
                <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  {cmmsMetrics.lowStockSpares.length > 0 ? (
                    <span>⚠️ {cmmsMetrics.lowStockSpares.length} Low Stock Alert</span>
                  ) : (
                    <span className="text-emerald-600">Stock Levels Healthy</span>
                  )}
                </div>
              </Link>

              {/* Module 4: Suppliers Management */}
              <Link to="/suppliers" className="bg-slate-50/70 hover:bg-blue-50/40 p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-700 group-hover:text-blue-700">Suppliers Management</span>
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">{cmmsMetrics.totalSuppliers} Vendors</div>
                <div className="text-[11px] font-bold text-amber-600">
                  Registered Supplier Master
                </div>
              </Link>

              {/* Module 5: Machine Management */}
              <Link to="/machine-management" className="bg-slate-50/70 hover:bg-blue-50/40 p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-700 group-hover:text-blue-700">Machine Management</span>
                  <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Cpu className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">{cmmsMetrics.totalMachines} Machines</div>
                <div className="text-[11px] font-bold text-red-600">
                  {cmmsMetrics.breakdownCategoryWO} Active Breakdowns
                </div>
              </Link>

              {/* Module 6: Facility Management */}
              <Link to="/facility-management" className="bg-slate-50/70 hover:bg-blue-50/40 p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-700 group-hover:text-blue-700">Facility Management</span>
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">{mainFacilities.length} Facilities</div>
                <div className="text-[11px] font-bold text-indigo-600">
                  {facilities.length} Sub-Facilities / Lines
                </div>
              </Link>

              {/* Module 7: Employee Master */}
              <Link to="/master/employee" className="bg-slate-50/70 hover:bg-blue-50/40 p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-700 group-hover:text-blue-700">Employee Master</span>
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">{cmmsMetrics.totalEmployees} Staff</div>
                <div className="text-[11px] font-bold text-rose-600">
                  Maintenance Technicians
                </div>
              </Link>

              {/* Module 8: All Assets Catalog */}
              <Link to="/assets" className="bg-slate-50/70 hover:bg-blue-50/40 p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-700 group-hover:text-blue-700">All Assets Catalog</span>
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Boxes className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">{machines.length + devices.length} Total Assets</div>
                <div className="text-[11px] font-bold text-blue-600">
                  Full Asset & SCADA Registry
                </div>
              </Link>

            </div>
          </div>

          {/* Quick Hub Navigation Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
                <TrendingUp className="w-4 h-4" /> CMMS Operations Quick Hub
              </div>
              <h3 className="text-xl font-extrabold text-white">Direct Module Navigation</h3>
              <p className="text-xs text-slate-300 mt-1">Jump directly to any active module in your manufacturing system</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/work-orders"
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Work Orders
              </Link>
              <Link
                to="/schedules"
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" /> Schedules
              </Link>
              <Link
                to="/spares"
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5" /> Spares
              </Link>
              <Link
                to="/suppliers"
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5" /> Suppliers
              </Link>
              <Link
                to="/machine-management"
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5" /> Machines
              </Link>
              <Link
                to="/facility-management"
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" /> Facilities
              </Link>
              <Link
                to="/master/employee"
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" /> Employees
              </Link>
            </div>
          </div>

          {/* TPM Six Big Losses Analysis Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Six Big Loss Breakdown (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">TPM Six Big Loss Analysis</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">OEE Loss Categorization</span>
                </div>

                <div className="space-y-4">
                  {cmmsMetrics.sixBigLosses.map((loss, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                        <span className="flex items-center gap-2 text-slate-800">
                          <span className={`w-2.5 h-2.5 rounded-full ${loss.color}`} />
                          {loss.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium">{loss.hours}</span>
                          <span className="text-slate-900 font-extrabold">{loss.pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`${loss.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${loss.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Total Cumulative Loss: <strong className="text-slate-800">{cmmsMetrics.breakdownDowntimeHours} Hours</strong></span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Target Loss Reduction: 15%
                </span>
              </div>
            </div>

            {/* TPM 6 Pillars Operational Status (5 cols) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">TPM 6 Pillars Status</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Pillar Adherence</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {cmmsMetrics.tpmPillars.map((pillar) => (
                  <div key={pillar.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{pillar.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{pillar.lead}</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {pillar.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bad Actor Equipment Analysis Table (IATF 16949 Traceability) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Bad Actor Equipment Analysis (Reliability Ranking)</h3>
                <p className="text-xs text-slate-500">Assets ranked by failure frequency, unplanned downtime, repair costs, and 5-Why RCA status</p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                IATF 16949 Compliant Traceability
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Equipment Code & Name</th>
                    <th className="py-3 px-6">Criticality</th>
                    <th className="py-3 px-6">Failures</th>
                    <th className="py-3 px-6">Downtime</th>
                    <th className="py-3 px-6">MTTR</th>
                    <th className="py-3 px-6">Repair Cost</th>
                    <th className="py-3 px-6">Repeat Failure</th>
                    <th className="py-3 px-6 text-right">RCA 5-Why Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {cmmsMetrics.badActors.length > 0 ? (
                    cmmsMetrics.badActors.map((actor) => (
                      <tr key={actor.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-slate-900">{actor.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{actor.code}</div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold ${actor.criticalityClass}`}>
                            {actor.criticality}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-bold text-slate-900">{actor.failures} Events</td>
                        <td className="py-3.5 px-6 font-bold text-red-600">{actor.downtime}</td>
                        <td className="py-3.5 px-6 font-mono text-slate-800">{actor.mttr}</td>
                        <td className="py-3.5 px-6 font-mono font-bold text-slate-900">{actor.cost}</td>
                        <td className="py-3.5 px-6">
                          {actor.repeat ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" /> Flagged Repeat
                            </span>
                          ) : (
                            <span className="text-slate-400">Normal</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-emerald-700">
                          {actor.rcaStatus}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-slate-500 font-medium">
                        No equipment breakdown or bad actor records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Work Orders Table Panel */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Work Orders</h3>
                <p className="text-xs text-slate-500">Latest active maintenance requests across facilities</p>
              </div>
              <Link 
                to="/work-orders" 
                className="text-xs font-bold text-green-600 hover:underline flex items-center gap-1"
              >
                View All Work Orders <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {cmmsLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">Loading work orders...</div>
            ) : filteredWorkOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-6">WO Number</th>
                      <th className="py-3 px-6">Machine</th>
                      <th className="py-3 px-6">Problem Description</th>
                      <th className="py-3 px-6">Priority</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredWorkOrders.slice(0, 5).map((wo) => {
                      const priorityColor = 
                        wo.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-200' :
                        wo.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        wo.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200';

                      const statusColor = 
                        wo.status === 'COMPLETED' || wo.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        wo.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        wo.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-700 border-slate-200';

                      return (
                        <tr key={wo.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-bold text-slate-900 font-mono">{wo.woNumber}</td>
                          <td className="py-3.5 px-6 font-semibold text-slate-800">{wo.machine?.name || 'Machine'}</td>
                          <td className="py-3.5 px-6 text-slate-600 max-w-xs truncate">{wo.problemDescription}</td>
                          <td className="py-3.5 px-6">
                            <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold ${priorityColor}`}>
                              {wo.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold ${statusColor}`}>
                              {wo.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <Link
                              to={`/work-orders?id=${wo.id}`}
                              className="text-xs font-bold text-green-600 hover:text-green-700 hover:underline"
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 font-medium">No work orders recorded yet</div>
            )}
          </div>
        </motion.div>
      )}

      {/* Save Default Selection Modal */}
      <AnimatePresence>
        {showDefaultPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-xs">
                  <Save size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Save as Default View?</h3>
                <p className="text-gray-500 mb-8 px-2 text-sm leading-relaxed">
                  Would you like to automatically load these selected machines every time you visit the dashboard?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDismissDefault}
                    className="flex-1 px-4 py-2.5 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 hover:text-gray-800 font-semibold transition-colors cursor-pointer"
                  >
                    No, thanks
                  </button>
                  <button
                    onClick={handleSaveDefault}
                    className="flex-1 px-4 py-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-500/20 font-semibold transition-colors cursor-pointer"
                  >
                    Yes, save it
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
