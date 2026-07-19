import { useEffect, useState } from 'react';
import { Activity, Clock, Bell, Maximize } from 'lucide-react';

export function TopHeaderActions() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Time Widget */}
      <div className="hidden sm:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
        <Clock size={18} className="text-blue-600" />
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
      <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-full border border-gray-200">
        <div className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-gray-900 leading-tight">MQTT</span>
          <span className="text-[10px] font-bold text-green-600">Connected</span>
        </div>
      </div>

      {/* System Widget */}
      <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-full border border-gray-200">
        <Activity size={18} className="text-green-500" />
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-gray-900 leading-tight">System</span>
          <span className="text-[10px] font-bold text-green-600">Online</span>
        </div>
      </div>

      {/* Bell */}
      <button className="relative w-11 h-11 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900 cursor-pointer">
        <Bell size={20} />
        <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
          3
        </span>
      </button>

      {/* Fullscreen */}
      <button className="hidden sm:flex w-11 h-11 bg-gray-50 rounded-full items-center justify-center border border-gray-200 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900 cursor-pointer">
        <Maximize size={18} />
      </button>
    </div>
  );
}
