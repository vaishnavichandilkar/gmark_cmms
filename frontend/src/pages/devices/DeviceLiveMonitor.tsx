import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Clock, Database } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

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
  0: 'Device Activate',
  1: 'Motor 1 ON/OFF',
  2: 'Motor 2 ON/OFF',
  3: 'Motor 3 ON/OFF',
  4: 'Motor 4 ON/OFF',
  5: 'Input Power Fault Type',
  6: 'Average Input Supply',
  7: 'R-Y Voltage',
  8: 'Y-B Voltage',
  9: 'R-B Voltage',
  10: 'Motor 1 R Phase Current',
  11: 'Motor 1 Y Phase Current',
  12: 'Motor 1 B Phase Current',
  13: 'Motor 2 R Phase Current',
  14: 'Motor 2 Y Phase Current',
  15: 'Motor 2 B Phase Current',
  16: 'Motor 3 R Phase Current',
  17: 'Motor 3 Y Phase Current',
  18: 'Motor 3 B Phase Current',
  19: 'Motor 4 R Phase Current',
  20: 'Motor 4 Y Phase Current',
  21: 'Motor 4 B Phase Current',
  22: 'Pressure Switch 1 ON/OFF',
  23: 'Pressure Switch 2 ON/OFF',
  24: 'Pressure Switch 3 ON/OFF',
  25: 'Pressure Switch 4 ON/OFF',
  26: 'Pressure Switch 5 ON/OFF',
  27: 'Pressure Bar Value',
  28: 'Transmitter Connection',
  29: 'Pressure Bar Value in mA',
  30: 'Delay for Pump ON',
  31: 'Next Filling Time',
  32: 'Over Load Reset Delay',
  33: 'Under Load Reset Delay',
  34: 'VFD Reset After',
  35: 'Under Ground Tank Full/Empty',
  36: 'Pressure Tank Pressure %',
  43: 'Pump 1 Fault Type',
  44: 'Pump 2 Fault Type',
  45: 'Pump 3 Fault Type',
  46: 'Pump 4 Fault Type',
  47: 'Motor 1 ON Time',
  48: 'Motor 2 ON Time',
  49: 'Motor 3 ON Time',
  50: 'Motor 4 ON Time',
  89: 'Motor 1 Activate/Deactivate',
  90: 'Motor 2 Activate/Deactivate',
  91: 'Motor 3 Activate/Deactivate',
  92: 'Motor 4 Activate/Deactivate'
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
        const res = await fetch(`http://localhost:3000/devices/${deviceId}/snapshot`);
        if (res.status === 404) {
          setRegisters([]);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to fetch snapshot');
        }
        const data: SnapshotData = await res.json();

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshot();
  }, [deviceId]);

  // Setup Socket.IO connection
  useEffect(() => {
    if (!deviceId) return;

    // Assuming backend is on same host or handled by proxy
    const socket: Socket = io(window.location.origin.replace('5173', '3000'), {
      transports: ['websocket'],
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

  const group1 = registers.filter(r => Number(r.register) <= 70);
  const group2 = registers.filter(r => Number(r.register) > 70);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-rose-500 mb-4 flex justify-center"><Activity size={48} /></div>
        <h2 className="text-xl font-bold text-white">Error Loading Device</h2>
        <p className="text-[rgba(255,255,255,0.45)]">{error}</p>
        <button
          onClick={() => navigate('/devices')}
          className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg font-medium transition-colors"
        >
          Back to Devices
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-2 md:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/devices')}
            className="w-11 h-11 liquid-glass rounded-full text-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-lg md:text-xl font-black text-white tracking-tight uppercase truncate max-w-[200px] md:max-w-none">
                {deviceId}
              </h1>
              <div className={`flex items-center gap-2 px-2.5 py-0.5 rounded-full border shrink-0 ${socketConnected ? 'bg-[#30D158]/10 border-[#30D158]/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-[#30D158] animate-pulse' : 'bg-amber-500'}`}></div>
                <span className={`text-[9px] font-bold tracking-widest ${socketConnected ? 'text-[#30D158]' : 'text-amber-500'}`}>{socketConnected ? 'LIVE' : 'CONNECTING'}</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-[rgba(255,255,255,0.45)] mt-0.5">Real-time Register Values</p>
          </div>
        </div>

        <div className="flex items-center gap-6 liquid-glass px-5 py-3 rounded-[24px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[rgba(255,255,255,0.45)] uppercase tracking-wider flex items-center gap-1 mb-0.5"><Database size={12} /> Total Registers</span>
            <span className="font-mono text-lg font-bold text-white leading-none">{registers.length}</span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[rgba(255,255,255,0.45)] uppercase tracking-wider flex items-center gap-1 mb-0.5"><Clock size={12} /> Last Received</span>
            <span className="font-mono text-sm font-bold text-teal-400 leading-none mt-0.5">
              {lastUpdate ? lastUpdate.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }) : '--:--:--'}
            </span>
          </div>
        </div>
      </div>



      {/* Container 1 (Slave ID 1 - Block 1) */}
      <div className="mb-8">
        <div className="liquid-glass p-4 rounded-t-[24px] flex justify-between items-center border border-white/10 border-b-0">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 border border-teal-500/30">
              <Database size={18} />
            </div>
            <h2 className="font-bold tracking-wide text-sm uppercase">Slave ID: 1</h2>
          </div>
        </div>
        <div className="liquid-glass border border-white/10 border-t-white/5 rounded-b-[24px] p-4 sm:p-6 overflow-visible shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {group1.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[rgba(255,255,255,0.45)] font-medium">No registers matching criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
              {group1.map((reg, idx) => {
                const isZero = Number(reg.value) === 0;
                const registerName = REGISTER_NAMES[Number(reg.register)];
                return (
                  <div
                    key={idx}
                    className="relative bg-black/40 border border-white/5 rounded-lg p-1.5 flex flex-col items-center justify-center text-center group hover:border-white/20 hover:bg-white/5 transition-all duration-300 cursor-help min-h-[52px]"
                  >
                    <div className="text-[9px] font-mono text-[rgba(255,255,255,0.4)] tracking-wider uppercase mb-0.5">
                      Reg {reg.register}
                    </div>
                    <div className={`font-mono text-base font-bold tracking-tight ${isZero ? 'text-[rgba(255,255,255,0.25)]' : 'text-teal-400 group-hover:text-teal-300'} transition-colors`}>
                      {reg.value}
                    </div>

                    {/* Premium Liquid Glass Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 origin-bottom pointer-events-none z-50 text-center liquid-glass px-3 py-1.5 rounded-lg text-white text-[11px] font-medium tracking-wide shadow-xl">
                      {registerName || `Register ${reg.register}`}
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
        <div className="liquid-glass p-4 rounded-t-[24px] flex justify-between items-center border border-white/10 border-b-0">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 border border-teal-500/30">
              <Database size={18} />
            </div>
            <h2 className="font-bold tracking-wide text-sm uppercase">Slave ID: 1</h2>
          </div>
        </div>
        <div className="liquid-glass border border-white/10 border-t-white/5 rounded-b-[24px] p-4 sm:p-6 overflow-visible shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {group2.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[rgba(255,255,255,0.45)] font-medium">No registers matching criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
              {group2.map((reg, idx) => {
                const isZero = Number(reg.value) === 0;
                const registerName = REGISTER_NAMES[Number(reg.register)];
                return (
                  <div
                    key={idx}
                    className="relative bg-black/40 border border-white/5 rounded-lg p-1.5 flex flex-col items-center justify-center text-center group hover:border-white/20 hover:bg-white/5 transition-all duration-300 cursor-help min-h-[52px]"
                  >
                    <div className="text-[9px] font-mono text-[rgba(255,255,255,0.4)] tracking-wider uppercase mb-0.5">
                      Reg {reg.register}
                    </div>
                    <div className={`font-mono text-base font-bold tracking-tight ${isZero ? 'text-[rgba(255,255,255,0.25)]' : 'text-teal-400 group-hover:text-teal-300'} transition-colors`}>
                      {reg.value}
                    </div>

                    {/* Premium Liquid Glass Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 origin-bottom pointer-events-none z-50 text-center liquid-glass px-3 py-1.5 rounded-lg text-white text-[11px] font-medium tracking-wide shadow-xl">
                      {registerName || `Register ${reg.register}`}
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
