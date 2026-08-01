import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, RefreshCw, Activity, AlertTriangle, CheckCircle2, WifiOff, ChevronRight, Server, Clock, Upload, Printer, FileText, FileSpreadsheet } from 'lucide-react';
import { api } from '../../lib/api';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { exportData } from '../../utils/exportUtils';
import { getDeviceDashboardRoute } from '../../utils/deviceRoutes';

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

export function DevicesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'alerts' | 'healthy' | 'offline'>('all');

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

  const filteredDevices = devices.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      d.building.toLowerCase().includes(search.toLowerCase());
      
    let matchesFilter = true;
    if (filter === 'alerts') matchesFilter = (d.alertCount || 0) > 0;
    if (filter === 'healthy') matchesFilter = (d.alertCount || 0) === 0 && d.status === 'online';
    if (filter === 'offline') matchesFilter = d.status === 'offline';
    
    return matchesSearch && matchesFilter;
  });

  const handleExport = (format: 'pdf' | 'excel') => {
    const headers = ['Device Name', 'Device ID', 'Building', 'Topic', 'Status', 'Alerts'];
    const rows = filteredDevices.map(device => [
      device.name || '-',
      device.deviceId || '-',
      device.building || '-',
      device.topic || '-',
      device.status || '-',
      device.alertCount?.toString() || '0'
    ]);
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
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider">Device Info</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider">Active Alerts</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider">Last Update</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton columns={6} rows={5} />
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
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
                      onClick={() => navigate(getDeviceDashboardRoute(device.deviceId))}
                      className={`group transition-all duration-200 cursor-pointer ${
                        hasAlerts && isOnline 
                          ? 'bg-rose-50/30 hover:bg-rose-50/80' 
                          : 'hover:bg-gray-50/80'
                      }`}
                    >
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                          isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                          {device.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-600">{device.building}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 w-fit">
                          <Clock size={12} className="text-gray-400" />
                          {new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center ml-auto group-hover:bg-emerald-50 group-hover:border-emerald-200 group-hover:text-emerald-600 transition-all text-gray-400 shadow-sm">
                          <ChevronRight size={16} />
                        </div>
                      </td>
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
