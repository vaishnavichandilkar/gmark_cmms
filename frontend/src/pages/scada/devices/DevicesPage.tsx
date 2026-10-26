import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, RefreshCw, Activity, AlertTriangle, CheckCircle2, WifiOff, ChevronRight, Server, Clock, Upload, Printer, FileText, FileSpreadsheet, X } from 'lucide-react';
import { api } from '../../../lib/api';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import { exportData } from '../../../utils/exportUtils';
import { getDeviceDashboardRoute } from '../../../utils/deviceRoutes';
import { CustomSelect } from '../../../components/shared/CustomSelect';

import { ColumnCustomizer, type ColumnDefinition } from '../../../components/shared/ColumnCustomizer';

interface DeviceData {
  id: number;
  deviceId: string;
  name: string;
  building: string;
  topic: string;
  status: 'online' | 'offline';
  lastSeen: string;
  alerts?: string[];
  alertCount?: number;
}

const DEVICE_COLUMNS: ColumnDefinition[] = [
  { id: 'deviceInfo', label: 'Device Info', category: 'General', required: true, defaultVisible: true },
  { id: 'deviceId', label: 'Device ID', category: 'General', defaultVisible: false },
  { id: 'topic', label: 'MQTT Topic', category: 'Diagnostics', defaultVisible: false },
  { id: 'status', label: 'Status', category: 'Status', defaultVisible: true },
  { id: 'activeAlerts', label: 'Active Alerts', category: 'Diagnostics', defaultVisible: true },
  { id: 'location', label: 'Location', category: 'Location', defaultVisible: true },
  { id: 'lastSeen', label: 'Last Update', category: 'General', defaultVisible: true },
  { id: 'action', label: 'Action', category: 'General', required: true, defaultVisible: true },
];

const DEFAULT_DEVICE_VISIBLE_COLUMNS = DEVICE_COLUMNS.filter(c => c.defaultVisible !== false).map(c => c.id);

export function DevicesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'alerts' | 'healthy' | 'offline'>('all');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const filterPortalRef = useRef<HTMLDivElement>(null);
  const [filterCoords, setFilterCoords] = useState<{ top: number; right: number }>({ top: 0, right: 12 });

  const updateFilterPosition = () => {
    if (!filterBtnRef.current) return;
    const rect = filterBtnRef.current.getBoundingClientRect();
    setFilterCoords({ top: rect.bottom + 6, right: Math.max(12, window.innerWidth - rect.right) });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isFilterOpen &&
        filterBtnRef.current &&
        !filterBtnRef.current.contains(event.target as Node) &&
        filterPortalRef.current &&
        !filterPortalRef.current.contains(event.target as Node)
      ) {
        const target = event.target as HTMLElement;
        if (target && target.closest('[data-custom-select-portal="true"]')) return;
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('devices_table_columns');
      return saved ? JSON.parse(saved) : DEFAULT_DEVICE_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_DEVICE_VISIBLE_COLUMNS;
    }
  });

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/devices');
      setDevices(res.data);
    } catch (error) {
      console.error('Failed to fetch devices', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Compute KPIs
  const kpis = useMemo(() => {
    const total = devices.length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const withAlerts = devices.filter(d => (d.alertCount || 0) > 0 && d.status === 'online').length;
    
    // Health score: 100 - penalty for offline (20%) - penalty for alerts (10% per alert device)
    let healthScore = 100;
    if (total > 0) {
      const offlinePenalty = (offline / total) * 100;
      const alertPenalty = (withAlerts / total) * 50; 
      healthScore = Math.max(0, Math.round(100 - offlinePenalty - alertPenalty));
    } else {
      healthScore = 0;
    }

    return { total, offline, withAlerts, healthScore };
  }, [devices]);

  const uniqueBuildings = useMemo(() => {
    return Array.from(new Set(devices.map(d => d.building).filter(Boolean))).sort();
  }, [devices]);

  const filteredDevices = devices.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      d.building.toLowerCase().includes(search.toLowerCase());
      
    let matchesFilter = true;
    if (filter === 'alerts') matchesFilter = (d.alertCount || 0) > 0;
    if (filter === 'healthy') matchesFilter = (d.alertCount || 0) === 0 && d.status === 'online';
    if (filter === 'offline') matchesFilter = d.status === 'offline';

    // Active Filters (Customize Filters)
    if (activeFilters.status && d.status !== activeFilters.status.toLowerCase()) return false;
    if (activeFilters.building && d.building !== activeFilters.building) return false;
    if (activeFilters.alertStatus === 'With Alerts' && (d.alertCount || 0) === 0) return false;
    if (activeFilters.alertStatus === 'No Alerts' && (d.alertCount || 0) > 0) return false;
    
    return matchesSearch && matchesFilter;
  });

  const handleExport = (format: 'pdf' | 'excel') => {
    const allHeaders: { id: string; label: string; getValue: (d: DeviceData) => string }[] = [
      { id: 'deviceInfo', label: 'Device Name', getValue: d => d.name || '-' },
      { id: 'deviceId', label: 'Device ID', getValue: d => d.deviceId || '-' },
      { id: 'topic', label: 'MQTT Topic', getValue: d => d.topic || '-' },
      { id: 'status', label: 'Status', getValue: d => d.status || '-' },
      { id: 'activeAlerts', label: 'Alerts', getValue: d => (d.alertCount ?? (d.alerts?.length || 0)).toString() },
      { id: 'location', label: 'Building', getValue: d => d.building || '-' },
      { id: 'lastSeen', label: 'Last Update', getValue: d => d.lastSeen ? new Date(d.lastSeen).toLocaleString() : '-' },
    ];

    const activeHeaders = allHeaders.filter(h => visibleColumns.includes(h.id));
    const headers = activeHeaders.map(h => h.label);
    const rows = filteredDevices.map(device => activeHeaders.map(h => h.getValue(device)));

    exportData(headers, rows, 'Devices_Alerts_List', 'System Alerts & Monitoring', format);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full px-1 md:px-2 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">System Alerts & Monitoring</h1>
          <p className="text-sm font-medium text-gray-500">Enterprise-grade device registry and real-time fault detection.</p>
        </div>
        <div className="flex items-center gap-3">
          <ColumnCustomizer
            columns={DEVICE_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="devices_table_columns"
          />

          <div className="relative">
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => {
                if (!isFilterOpen) updateFilterPosition();
                setIsFilterOpen(!isFilterOpen);
              }}
              className={`flex items-center gap-1.5 h-10 px-3.5 border rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                Object.keys(activeFilters).length > 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              title="Filter"
            >
              <Filter className={`w-3.5 h-3.5 ${Object.keys(activeFilters).length > 0 ? 'text-emerald-600' : 'text-gray-500'}`} />
              <span className="font-semibold">Filter</span>
              {Object.keys(activeFilters).length > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                  {Object.keys(activeFilters).length}
                </span>
              )}
            </button>

            {isFilterOpen && createPortal(
              <div
                ref={filterPortalRef}
                style={{
                  position: 'fixed',
                  top: `${filterCoords.top}px`,
                  right: `${filterCoords.right}px`,
                  zIndex: 99999,
                }}
                className="w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                      <Filter className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 tracking-tight">Filter</span>
                      <p className="text-[10px] text-slate-500 leading-none mt-0.5">Filter devices by multiple criteria</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {Object.keys(activeFilters).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveFilters({})}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsFilterOpen(false)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3.5 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Device Status</label>
                    <CustomSelect
                      name="status"
                      value={activeFilters.status || ''}
                      onChange={(e) => setActiveFilters(prev => ({ ...prev, status: e.target.value }))}
                      placeholder="All"
                      options={[
                        { label: 'All', value: '' },
                        { label: 'Online', value: 'online' },
                        { label: 'Offline', value: 'offline' }
                      ]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Alert State</label>
                    <CustomSelect
                      name="alertStatus"
                      value={activeFilters.alertStatus || ''}
                      onChange={(e) => setActiveFilters(prev => ({ ...prev, alertStatus: e.target.value }))}
                      placeholder="All"
                      options={[
                        { label: 'All', value: '' },
                        { label: 'With Alerts', value: 'With Alerts' },
                        { label: 'No Alerts (Healthy)', value: 'No Alerts' }
                      ]}
                    />
                  </div>

                  {uniqueBuildings.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Building / Location</label>
                      <CustomSelect
                        name="building"
                        value={activeFilters.building || ''}
                        onChange={(e) => setActiveFilters(prev => ({ ...prev, building: e.target.value }))}
                        placeholder="All"
                        options={[
                          { label: 'All', value: '' },
                          ...uniqueBuildings.map(b => ({ label: b, value: b }))
                        ]}
                      />
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>
          <button className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer" title="Import">
            <Upload size={16} />
          </button>
          <button onClick={() => handleExport('pdf')} className="p-2.5 bg-blue-50 border border-blue-200 text-blue-700 hover:text-blue-800 hover:border-blue-300 hover:bg-blue-100 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer" title="Export PDF">
            <FileText size={16} />
          </button>
          <button onClick={() => handleExport('excel')} className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer" title="Export Excel">
            <FileSpreadsheet size={16} />
          </button>
          <button onClick={handlePrint} className="p-2.5 bg-white border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer" title="Print">
            <Printer size={16} />
          </button>
          <button
            onClick={fetchDevices}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 rounded-xl transition-all shadow-sm flex items-center gap-2 font-bold text-sm"
            title="Refresh Status"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-emerald-500" : ""} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 print:hidden">
        {/* Health Score */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center border border-emerald-200 shrink-0 z-10">
            <Activity size={24} className="text-emerald-600" />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">System Health</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{kpis.healthScore}%</h3>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 z-10 transition-colors ${kpis.withAlerts > 0 ? 'bg-rose-100 border-rose-200' : 'bg-gray-100 border-gray-200'}`}>
            <AlertTriangle size={24} className={kpis.withAlerts > 0 ? 'text-rose-600 animate-pulse' : 'text-gray-400'} />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Active Alerts</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{kpis.withAlerts}</h3>
          </div>
        </div>

        {/* Total Devices */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200 shrink-0 z-10">
            <Server size={24} className="text-blue-600" />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Devices</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{kpis.total}</h3>
          </div>
        </div>

        {/* Offline Devices */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 z-10 transition-colors ${kpis.offline > 0 ? 'bg-orange-100 border-orange-200' : 'bg-gray-100 border-gray-200'}`}>
            <WifiOff size={24} className={kpis.offline > 0 ? 'text-orange-600' : 'text-gray-400'} />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Offline</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{kpis.offline}</h3>
          </div>
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by device name, ID, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-gray-400"
          />
        </div>
        <div className="flex items-center w-full lg:w-auto">
          <div className="flex items-center p-1 bg-gray-100/80 rounded-xl border border-gray-200 w-full lg:w-auto overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setFilter('all')}
              className={`whitespace-nowrap px-5 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900 border border-transparent'}`}
            >
              All Devices
            </button>
            <button
              onClick={() => setFilter('alerts')}
              className={`whitespace-nowrap px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === 'alerts' ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-200' : 'text-gray-500 hover:text-rose-600 border border-transparent'}`}
            >
              <AlertTriangle size={14} /> Alerts
            </button>
            <button
              onClick={() => setFilter('healthy')}
              className={`whitespace-nowrap px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === 'healthy' ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-200' : 'text-gray-500 hover:text-emerald-600 border border-transparent'}`}
            >
              <CheckCircle2 size={14} /> Healthy
            </button>
            <button
              onClick={() => setFilter('offline')}
              className={`whitespace-nowrap px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === 'offline' ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-200' : 'text-gray-500 hover:text-orange-600 border border-transparent'}`}
            >
              <WifiOff size={14} /> Offline
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                {visibleColumns.includes('deviceInfo') && (
                  <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Device Info</th>
                )}
                {visibleColumns.includes('deviceId') && (
                  <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Device ID</th>
                )}
                {visibleColumns.includes('topic') && (
                  <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">MQTT Topic</th>
                )}
                {visibleColumns.includes('status') && (
                  <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Status</th>
                )}
                {visibleColumns.includes('activeAlerts') && (
                  <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Active Alerts</th>
                )}
                {visibleColumns.includes('location') && (
                  <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Location</th>
                )}
                {visibleColumns.includes('lastSeen') && (
                  <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Last Update</th>
                )}
                {visibleColumns.includes('action') && (
                  <th className="px-4 py-3 text-right text-[11px] font-black text-gray-500 uppercase tracking-wider">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton columns={visibleColumns.length} rows={5} />
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Filter size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No devices found</h3>
                    <p className="text-gray-500 text-sm">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map(device => {
                  const hasAlerts = (device.alertCount || 0) > 0;
                  const isOnline = device.status === 'online';
                  
                  return (
                    <tr 
                      key={device.id} 
                      onClick={() => navigate(`/devices/${device.deviceId || device.id}`)}
                      className={`group transition-all duration-200 cursor-pointer ${
                        hasAlerts && isOnline 
                          ? 'bg-rose-50/30 hover:bg-rose-50/80' 
                          : 'hover:bg-gray-50/80'
                      }`}
                    >
                      {visibleColumns.includes('deviceInfo') && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors shadow-sm ${
                              hasAlerts && isOnline ? 'bg-white border-rose-200 text-rose-500' :
                              isOnline ? 'bg-white border-emerald-200 text-emerald-500' : 
                              'bg-gray-50 border-gray-200 text-gray-400'
                            }`}>
                              <Server size={18} />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">{device.name}</h4>
                              <p className="text-xs font-medium text-gray-400 font-mono mt-0.5">{device.deviceId}</p>
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('deviceId') && (
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200">{device.deviceId}</span>
                        </td>
                      )}
                      {visibleColumns.includes('topic') && (
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-gray-600 max-w-[200px] truncate block" title={device.topic}>{device.topic || '-'}</span>
                        </td>
                      )}
                      {visibleColumns.includes('status') && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                            isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                            {device.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('activeAlerts') && (
                        <td className="px-4 py-3">
                          {isOnline ? (
                            hasAlerts ? (
                              <div className="flex flex-wrap gap-1.5">
                                {device.alerts?.map((alert, i) => (
                                  <span key={i} className="px-2 py-1 bg-white border border-rose-200 text-rose-600 text-[11px] font-bold rounded-md shadow-sm flex items-center gap-1">
                                    <AlertTriangle size={10} />
                                    {alert}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold bg-white px-2 py-1 rounded-md border border-emerald-100 shadow-sm w-fit">
                                <CheckCircle2 size={12} /> Normal
                              </span>
                            )
                          ) : (
                            <span className="text-gray-300 text-xs font-bold">-</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.includes('location') && (
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-gray-600">{device.building}</span>
                        </td>
                      )}
                      {visibleColumns.includes('lastSeen') && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 w-fit">
                            <Clock size={12} className="text-gray-400" />
                            {new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('action') && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(() => {
                              const scadaRoute = getDeviceDashboardRoute(device.deviceId);
                              const hasScada = scadaRoute && scadaRoute !== `/devices/${device.deviceId}`;
                              if (!hasScada) return null;
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(scadaRoute);
                                  }}
                                  className="px-2.5 py-1 text-xs font-bold text-gray-600 hover:text-emerald-700 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-lg transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Open Visual SCADA Dashboard"
                                >
                                  <Activity size={12} className="text-emerald-600" />
                                  <span className="hidden sm:inline">Dashboard</span>
                                </button>
                              );
                            })()}
                            <div 
                              className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center group-hover:bg-emerald-50 group-hover:border-emerald-200 group-hover:text-emerald-600 transition-all text-gray-400 shadow-sm"
                              title="View Registers"
                            >
                              <ChevronRight size={16} />
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
