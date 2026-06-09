import { useEffect, useState } from 'react';
import { DeviceCard } from '../../components/devices/DeviceCard';
import { Search, Filter, RefreshCw } from 'lucide-react';

interface DeviceData {
  id: number;
  deviceId: string;
  name: string;
  building: string;
  topic: string;
  status: 'online' | 'offline';
  lastSeen: string;
}

export function DevicesPage() {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/devices');
      const data = await res.json();
      setDevices(data);
    } catch (error) {
      console.error('Failed to fetch devices', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const filteredDevices = devices.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || 
                          d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
                          d.building.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ? true : d.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Device Registry</h1>
          <p className="text-sm font-medium text-[rgba(255,255,255,0.45)]">Manage and monitor all connected IoT devices across facilities.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDevices}
            className="p-2.5 liquid-glass border border-white/10 text-[rgba(255,255,255,0.7)] hover:text-teal-400 hover:border-teal-500/50 rounded-xl transition-all shadow-sm flex items-center justify-center"
            title="Refresh Devices"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="liquid-glass p-4 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 mb-8 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.45)]" size={20} />
          <input 
            type="text" 
            placeholder="Search by name, ID, or building..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/5 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500/50 transition-all placeholder-[rgba(255,255,255,0.3)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-black/20 rounded-xl border border-white/5">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-[rgba(255,255,255,0.45)] hover:text-white'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('online')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'online' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-[rgba(255,255,255,0.45)] hover:text-white'}`}
            >
              Online
            </button>
            <button 
              onClick={() => setFilter('offline')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'offline' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-[rgba(255,255,255,0.45)] hover:text-white'}`}
            >
              Offline
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[250px] bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map(device => (
            <DeviceCard key={device.id} {...device} />
          ))}
          {filteredDevices.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <div className="w-16 h-16 bg-black/20 border border-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter size={32} className="text-[rgba(255,255,255,0.45)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No devices found</h3>
              <p className="text-[rgba(255,255,255,0.45)] text-sm">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
