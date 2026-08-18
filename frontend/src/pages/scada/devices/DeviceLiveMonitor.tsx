import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Clock, Database } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { api } from '../../../lib/api';

interface Register {
  register: string | number;
  value: number | string;
}

interface SnapshotData {
  id: number;
  deviceId: string;
  payload: {
    registers?: Register[];
    [key: string]: any;
  };
  createdAt: string;
}

const REGISTER_NAMES: Record<number, string> = {
  40000: 'Device Activate',
  40001: 'Motor 1 ON/OFF',
  40002: 'Motor 2 ON/OFF',
  40003: 'Motor 3 ON/OFF',
  40004: 'Motor 4 ON/OFF',
  40005: 'Input Power Fault Type',
  40006: 'Average Input Supply',
  40007: 'R-Y Voltage',
  40008: 'Y-B Voltage',
  40009: 'R-B Voltage',
  40010: 'Motor 1 R Phase Current',
  40011: 'Motor 1 Y Phase Current',
  40012: 'Motor 1 B Phase Current',
  40013: 'Motor 2 R Phase Current',
  40014: 'Motor 2 Y Phase Current',
  40015: 'Motor 2 B Phase Current',
  40016: 'Motor 3 R Phase Current',
  40017: 'Motor 3 Y Phase Current',
  40018: 'Motor 3 B Phase Current',
  40019: 'Motor 4 R Phase Current',
  40020: 'Motor 4 Y Phase Current',
  40021: 'Motor 4 B Phase Current',
  40022: 'INWL(DI1)',
  40023: 'Power Switch 1 ON/OFF',
  40024: 'Power Switch 2 ON/OFF',
  40025: 'Power Switch 3 ON/OFF',
  40026: 'Power Switch 4 ON/OFF',
  40027: 'Pressure Bar Value',
  40028: 'Transmitter Connection',
  40029: 'Pressure Bar Value in mA',
  40030: 'Delay for Pump ON',
  40031: 'Next Filling Time',
  40032: 'Over Load Reset Delay',
  40033: 'Under Load Reset Delay',
  40034: 'VFD Reset After',
  40035: 'Under Ground Tank Full/Empty',
  40036: 'Pressure Tank Pressure %',
  40043: 'Pump 1 Fault Type',
  40044: 'Pump 2 Fault Type',
  40045: 'Pump 3 Fault Type',
  40046: 'Pump 4 Fault Type',
  40047: 'Motor 1 ON Time',
  40048: 'Motor 2 ON Time',
  40049: 'Motor 3 ON Time',
  40050: 'Motor 4 ON Time',
  40089: 'Motor 1 Activate/Deactivate',
  40090: 'Motor 2 Activate/Deactivate',
  40091: 'Motor 3 Activate/Deactivate',
  40092: 'Motor 4 Activate/Deactivate',

  // Fire Panel Registers
  40141: 'Line-1 Main Pump On (Cmd)',
  40142: 'Line-2 Main Pump On (Cmd)',
  40143: 'Line-2 Jockey Pump On (Cmd)',
  40144: 'Line-1 Jockey Pump On (Cmd)',
  40145: 'DG On (Cmd)',
  40146: 'Line-2 Main Pump Off (Cmd)',
  40147: 'Line-2 Jockey Pump Off (Cmd)',
  40148: 'Line-1 Jockey Pump Off (Cmd)',
  
  40151: 'Line-1 Main Pump Auto',
  40152: 'Line-1 Main Pump Manual',
  40153: 'Line-1 Main Pump ON',
  40154: 'Line-1 Main Pump OFF',
  40155: 'Line-1 Main Pump Trip',
  40156: 'UZ Line-1 Pressure',
  40157: 'UZ Line-2 Pressure',
  
  40161: 'Line-2 Main Pump Auto',
  40162: 'Line-2 Main Pump Manual',
  40163: 'Line-2 Main Pump ON',
  40164: 'Line-2 Main Pump OFF',
  40165: 'Line-2 Main Pump Trip',
  
  40166: 'Line-1 Jockey Pump Auto',
  40167: 'Line-1 Jockey Pump Manual',
  40168: 'Line-1 Jockey Pump ON',
  40169: 'Line-1 Jockey Pump OFF',
  40170: 'Line-1 Jockey Pump Trip',
  
  40171: 'DG Auto ON',
  40172: 'DG Manual ON'
};

export function DeviceLiveMonitor() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch initial snapshot
  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const res = await api.get(`/devices/${deviceId}/snapshot`);
        const data: SnapshotData = res.data;

        if (data.payload && Array.isArray(data.payload.registers)) {
          setRegisters(data.payload.registers);
        } else {
          // fallback if it's an object of registers
          const rawRegs: Register[] = [];
          if (data.payload) {
            Object.entries(data.payload).forEach(([k, v]) => {
              if (k !== 'registers') {
                rawRegs.push({ register: k, value: String(v) });
              }
            });
          }
          setRegisters(rawRegs);
        }
        setLastUpdate(new Date(data.createdAt));
      } catch (err: any) {
        if (err.response?.status === 404) {
          setRegisters([]);
        } else {
          setError(err.response?.data?.message || err.message || 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshot();
  }, [deviceId]);

  // Setup Socket.IO connection
  useEffect(() => {
    if (!deviceId) return;

    const token = localStorage.getItem('token');
    const socket: Socket = io('http://localhost:3001', {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join-device', { topic: deviceId });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('device-update', (data: any) => {
      if (data.deviceId === deviceId) {
        if (data.rawRegisters && Array.isArray(data.rawRegisters)) {
          setRegisters((prev) => {
            const mergedMap = new Map<number, number | string>();
            prev.forEach((r) => {
              mergedMap.set(Number(r.register), r.value);
            });
            data.rawRegisters.forEach((r: any) => {
              mergedMap.set(Number(r.register), r.value);
            });
            const mergedList = Array.from(mergedMap.entries()).map(([register, value]) => ({
              register,
              value,
            }));
            mergedList.sort((a, b) => a.register - b.register);
            return mergedList;
          });
          setLastUpdate(new Date());
        }
      }
    });

    return () => {
      socket.emit('leave-device', { topic: deviceId });
      socket.disconnect();
    };
  }, [deviceId]);

  const group1 = registers.filter(r => {
    const regNum = Number(r.register);
    const norm = regNum < 40000 ? regNum + 40000 : regNum;
    return norm <= 40070;
  });
  const group2 = registers.filter(r => {
    const regNum = Number(r.register);
    const norm = regNum < 40000 ? regNum + 40000 : regNum;
    return norm > 40070;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-rose-500 mb-4 flex justify-center"><Activity size={48} /></div>
        <h2 className="text-xl font-bold text-gray-900">Error Loading Device</h2>
        <p className="text-gray-500">{error}</p>
        <button
          onClick={() => navigate('/devices')}
          className="mt-6 px-6 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm rounded-lg font-medium transition-colors"
        >
          Back to Devices
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-1 md:px-2 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/devices')}
            className="w-11 h-11 bg-white border border-gray-200 shadow-sm rounded-full text-gray-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-lg md:text-xl font-black text-gray-900 tracking-tight uppercase truncate max-w-[200px] md:max-w-none">
                {deviceId}
              </h1>
              <div className={`flex items-center gap-2 px-2.5 py-0.5 rounded-full border shrink-0 ${socketConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                <span className={`text-[9px] font-bold tracking-widest ${socketConnected ? 'text-emerald-700' : 'text-amber-700'}`}>{socketConnected ? 'LIVE' : 'CONNECTING'}</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">Real-time Register Values</p>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-0.5"><Database size={12} /> Total Registers</span>
            <span className="font-mono text-lg font-bold text-gray-900 leading-none">{registers.length}</span>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-0.5"><Clock size={12} /> Last Received</span>
            <span className="font-mono text-sm font-bold text-emerald-600 leading-none mt-0.5">
              {lastUpdate ? lastUpdate.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }) : '--:--:--'}
            </span>
          </div>
        </div>
      </div>



      {/* Container 1 (Slave ID 1 - Block 1) */}
      <div className="mb-8">
        <div className="bg-white p-4 rounded-t-2xl flex justify-between items-center border border-gray-200 border-b-0">
          <div className="flex items-center gap-3 text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
              <Database size={18} />
            </div>
            <h2 className="font-bold tracking-wide text-sm uppercase">Slave ID: 1 (Block 1)</h2>
          </div>
        </div>
        <div className="bg-gray-50/50 border border-gray-200 rounded-b-2xl p-4 sm:p-6 shadow-inner">
          {group1.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 font-medium text-sm">No registers matching criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {group1.map((reg, idx) => {
                const isZero = Number(reg.value) === 0;
                const normReg = Number(reg.register) < 40000 ? Number(reg.register) + 40000 : Number(reg.register);
                const registerName = REGISTER_NAMES[normReg];
                return (
                  <div
                    key={idx}
                    className="relative bg-white border border-gray-200 rounded-xl p-2 flex flex-col items-center justify-center text-center group hover:border-emerald-300 hover:shadow-md transition-all duration-200 cursor-help min-h-[64px] shadow-sm"
                  >
                    <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-1">
                      Reg {reg.register}
                    </div>
                    <div className={`font-mono text-lg font-black tracking-tight ${isZero ? 'text-gray-400' : 'text-gray-900 group-hover:text-emerald-600'} transition-colors`}>
                      {reg.value}
                    </div>

                    {/* Premium Dark Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 origin-bottom pointer-events-none z-50 text-center bg-gray-900 px-3 py-1.5 rounded-lg text-white text-[11px] font-medium tracking-wide shadow-xl border border-gray-700">
                      {registerName || `Register ${normReg}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Container 2 (Slave ID 1 - Block 2) */}
      <div className="mb-8">
        <div className="bg-white p-4 rounded-t-2xl flex justify-between items-center border border-gray-200 border-b-0">
          <div className="flex items-center gap-3 text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
              <Database size={18} />
            </div>
            <h2 className="font-bold tracking-wide text-sm uppercase">Slave ID: 1 (Block 2)</h2>
          </div>
        </div>
        <div className="bg-gray-50/50 border border-gray-200 rounded-b-2xl p-4 sm:p-6 shadow-inner">
          {group2.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 font-medium text-sm">No registers matching criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {group2.map((reg, idx) => {
                const isZero = Number(reg.value) === 0;
                const normReg = Number(reg.register) < 40000 ? Number(reg.register) + 40000 : Number(reg.register);
                const registerName = REGISTER_NAMES[normReg];
                return (
                  <div
                    key={idx}
                    className="relative bg-white border border-gray-200 rounded-xl p-2 flex flex-col items-center justify-center text-center group hover:border-emerald-300 hover:shadow-md transition-all duration-200 cursor-help min-h-[64px] shadow-sm"
                  >
                    <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-1">
                      Reg {reg.register}
                    </div>
                    <div className={`font-mono text-lg font-black tracking-tight ${isZero ? 'text-gray-400' : 'text-gray-900 group-hover:text-emerald-600'} transition-colors`}>
                      {reg.value}
                    </div>

                    {/* Premium Dark Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 origin-bottom pointer-events-none z-50 text-center bg-gray-900 px-3 py-1.5 rounded-lg text-white text-[11px] font-medium tracking-wide shadow-xl border border-gray-700">
                      {registerName || `Register ${normReg}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
