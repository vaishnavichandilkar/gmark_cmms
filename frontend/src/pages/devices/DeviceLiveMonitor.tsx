import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Activity, Server, Clock, Database } from 'lucide-react';
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

export function DeviceLiveMonitor() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch initial snapshot
  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`http://localhost:3000/devices/${deviceId}/snapshot`);
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
          setRegisters(data.rawRegisters);
          setLastUpdate(new Date());
        }
      }
    });

    return () => {
      socket.emit('leave-device', { topic: deviceId });
      socket.disconnect();
    };
  }, [deviceId]);

  const filteredRegisters = registers.filter(r => {
    const searchLower = search.toLowerCase();
    return String(r.register).toLowerCase().includes(searchLower) || 
           String(r.value).toLowerCase().includes(searchLower);
  });

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
        <h2 className="text-xl font-bold text-gray-900">Error Loading Device</h2>
        <p className="text-gray-500">{error}</p>
        <button 
          onClick={() => navigate('/devices')}
          className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-lg font-medium"
        >
          Back to Devices
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/devices')}
            className="p-2.5 liquid-glass border border-white/10 text-[rgba(255,255,255,0.7)] hover:text-white hover:border-white/20 rounded-xl transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-white tracking-tight">{deviceId}</h1>
              <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider backdrop-blur-md ${socketConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-500'}`} />
                {socketConnected ? 'Live' : 'Connecting'}
              </div>
            </div>
            <p className="text-sm font-medium text-[rgba(255,255,255,0.45)] flex items-center gap-2">
              <Server size={14} /> SCADA Register Monitor
            </p>
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

      {/* Controls */}
      <div className="liquid-glass p-4 rounded-t-[24px] flex flex-col sm:flex-row gap-4 justify-between items-center border border-white/10 border-b-0">
        <div className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 border border-teal-500/30">
            <Activity size={18} />
          </div>
          <h2 className="font-bold tracking-wide">Real-time Register Values</h2>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.45)]" size={16} />
          <input 
            type="text" 
            placeholder="Search address or value..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/5 rounded-xl text-sm font-medium text-white placeholder-[rgba(255,255,255,0.3)] focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500/50 transition-all"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="liquid-glass border border-white/10 border-t-white/5 rounded-b-[24px] p-4 sm:p-6 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {filteredRegisters.length === 0 ? (
          <div className="text-center py-16">
            <Database size={48} className="mx-auto text-[rgba(255,255,255,0.2)] mb-4" />
            <p className="text-[rgba(255,255,255,0.45)] font-medium">No registers matching criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filteredRegisters.map((reg, idx) => {
              // SCADA aesthetic for individual cells
              const isZero = Number(reg.value) === 0;
              return (
                <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col justify-between group hover:border-white/20 hover:bg-white/5 transition-all duration-300">
                  <div className="text-[10px] font-mono text-[rgba(255,255,255,0.45)] mb-1 tracking-wider uppercase">
                    Reg {reg.register}
                  </div>
                  <div className={`font-mono text-lg font-bold tracking-tight ${isZero ? 'text-[rgba(255,255,255,0.3)]' : 'text-teal-400 group-hover:text-teal-300'} transition-colors`}>
                    {reg.value}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
