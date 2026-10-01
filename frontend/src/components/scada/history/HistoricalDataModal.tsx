import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  RefreshCw,
  Download,
  Database,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface HistoricalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
}

interface HistoryRecord {
  id: number;
  deviceId: string;
  historyMode?: string;
  payload: any;
  createdAt: string;
}

export const HistoricalDataModal: React.FC<HistoricalDataModalProps> = ({
  isOpen,
  onClose,
  deviceId,
}) => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const fetchHistory = async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const res = await api.get(`/devices/${deviceId}/history`, {
        params: { limit: 100 },
      });
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error('Failed to fetch historical snapshots', err);
      toast.error('Failed to load historical data logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, deviceId]);

  if (!isOpen) return null;

  const handleExportExcel = () => {
    if (records.length === 0) {
      toast.error('No historical records to export');
      return;
    }

    const rows = records.map((r) => {
      const p = r.payload?.parsedState || r.payload || {};
      return {
        'Log ID': r.id,
        'Device Code': r.deviceId,
        Timestamp: new Date(r.createdAt).toLocaleString(),
        Mode: r.historyMode || 'Time-based',
        'Pressure (Bar)': p.pressureBar ?? '-',
        'Avg Voltage (V)': p.averageVoltage ?? '-',
        'R-Y Voltage': p.ryVoltage ?? '-',
        'Y-B Voltage': p.ybVoltage ?? '-',
        'R-B Voltage': p.rbVoltage ?? '-',
        'Motor 1': p.motor1Status ? 'RUNNING' : 'OFF',
        'Motor 2': p.motor2Status ? 'RUNNING' : 'OFF',
        'Motor 3': p.motor3Status ? 'RUNNING' : 'OFF',
        'Motor 4': p.motor4Status ? 'RUNNING' : 'OFF',
        'Water Available': p.waterAvailable ? 'YES' : 'NO',
        'Fault Code': p.inputPowerFaultType ?? 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historical_Logs');
    XLSX.writeFile(workbook, `${deviceId}_historical_data_${Date.now()}.xlsx`);
    toast.success('Historical data exported to Excel');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  Historical Telemetry Data
                </h3>
                <span className="text-[11px] font-mono font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200">
                  {deviceId}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Saved snapshots &amp; telemetry logging records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh Logs"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Export to Excel"
            >
              <Download size={14} />
              <span>Export Excel</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#f8f9fa]">
          {loading && records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <RefreshCw size={28} className="animate-spin text-emerald-600" />
              <p className="text-sm font-semibold">Loading historical snapshots...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3 bg-white rounded-2xl border border-gray-200">
              <Database size={36} className="text-gray-300" />
              <p className="text-base font-bold text-gray-700">No Historical Records Found</p>
              <p className="text-xs text-gray-500 max-w-sm text-center">
                Historical logging may be paused or newly configured. Incoming telemetry matching your configured interval or conditions will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-200 flex justify-between items-center text-xs font-bold text-gray-600">
                <span>Showing latest {records.length} records</span>
                <span className="text-gray-400 font-normal">Click any row to view raw payload</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Pressure</th>
                      <th className="px-4 py-3">Avg Voltage</th>
                      <th className="px-4 py-3">Pump 1</th>
                      <th className="px-4 py-3">Pump 2</th>
                      <th className="px-4 py-3">Water</th>
                      <th className="px-4 py-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.map((r) => {
                      const p = r.payload?.parsedState || r.payload || {};
                      const isExpanded = expandedRow === r.id;

                      return (
                        <React.Fragment key={r.id}>
                          <tr
                            onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                            className="hover:bg-emerald-50/30 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-gray-400" />
                                <span>{new Date(r.createdAt).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  r.historyMode === 'Conditional'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {r.historyMode || 'Time-based'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-gray-900">
                              {p.pressureBar !== undefined ? `${p.pressureBar} bar` : '-'}
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-700">
                              {p.averageVoltage !== undefined ? `${p.averageVoltage} V` : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  p.motor1Status
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {p.motor1Status ? 'ON' : 'OFF'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  p.motor2Status
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {p.motor2Status ? 'ON' : 'OFF'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-[9px] font-bold ${
                                  p.waterAvailable ? 'text-emerald-600' : 'text-amber-600'
                                }`}
                              >
                                {p.waterAvailable ? 'Available' : 'Low'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-gray-50/90 border-b border-gray-200">
                              <td colSpan={8} className="px-6 py-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                    <Layers size={14} className="text-emerald-600" />
                                    <span>Raw Telemetry Payload Snapshot (ID #{r.id})</span>
                                  </div>
                                  <pre className="p-3 bg-gray-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 custom-scrollbar border border-gray-800 shadow-inner">
                                    {JSON.stringify(r.payload, null, 2)}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
