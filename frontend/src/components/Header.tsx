import { useEffect, useState } from 'react';
import { Activity, Clock, Bell, Maximize } from 'lucide-react';

interface HeaderProps {
  facilityName: string;
}

export function Header({ facilityName }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 mb-1 leading-tight">
          {facilityName}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 font-medium">Facility Overview Dashboard</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        {/* Time Widget */}
        <div className="hidden sm:flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
          <Clock size={18} className="text-blue-500" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 leading-tight">
              {time.toLocaleTimeString()}
            </span>
            <span className="text-[10px] font-medium text-gray-500 uppercase">
              {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
        
        {/* MQTT Widget */}
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-full shadow-sm border border-gray-100">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-900 leading-tight">MQTT</span>
            <span className="text-[10px] font-bold text-emerald-500">Connected</span>
          </div>
        </div>

        {/* System Widget */}
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-full shadow-sm border border-gray-100">
          <Activity size={18} className="text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-900 leading-tight">System</span>
            <span className="text-[10px] font-bold text-emerald-500">Online</span>
          </div>
        </div>

        {/* Bell */}
        <button className="relative w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
            3
          </span>
        </button>

        {/* Fullscreen */}
        <button className="hidden sm:flex w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
          <Maximize size={18} className="text-gray-600" />
        </button>
      </div>
    </header>
  );
}
