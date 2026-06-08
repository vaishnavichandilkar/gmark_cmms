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
            className="p-2.5 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">{deviceId}</h1>
              <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider ${socketConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {socketConnected ? 'Live' : 'Connecting'}
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Server size={14} /> SCADA Register Monitor
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-0.5"><Database size={12} /> Total Registers</span>
            <span className="font-mono text-lg font-bold text-gray-900 leading-none">{registers.length}</span>
          </div>
          <div className="w-px h-8 bg-gray-100"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-0.5"><Clock size={12} /> Last Received</span>
            <span className="font-mono text-sm font-bold text-blue-600 leading-none mt-0.5">
              {lastUpdate ? lastUpdate.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }) : '--:--:--'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1e1e24] p-4 rounded-t-2xl flex flex-col sm:flex-row gap-4 justify-between items-center border border-[#2b2b36]">
        <div className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity size={18} />
          </div>
          <h2 className="font-bold tracking-wide">Real-time Register Values</h2>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder="Search address or value..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#121216] border border-[#2b2b36] rounded-xl text-sm font-medium text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="bg-[#121216] border border-[#2b2b36] border-t-0 rounded-b-2xl p-4 sm:p-6 overflow-hidden shadow-2xl">
        {filteredRegisters.length === 0 ? (
          <div className="text-center py-16">
            <Database size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-400 font-medium">No registers matching criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filteredRegisters.map((reg, idx) => {
              // SCADA aesthetic for individual cells
              const isZero = Number(reg.value) === 0;
              return (
                <div key={idx} className="bg-[#1e1e24] border border-[#2b2b36] rounded-lg p-3 flex flex-col justify-between group hover:border-[#4a4a5a] transition-colors">
                  <div className="text-[10px] font-mono text-gray-500 mb-1 tracking-wider uppercase">
                    Reg {reg.register}
                  </div>
                  <div className={`font-mono text-lg font-bold tracking-tight ${isZero ? 'text-gray-400' : 'text-emerald-400 group-hover:text-emerald-300'} transition-colors`}>
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
