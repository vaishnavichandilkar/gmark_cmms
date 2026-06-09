import { Wifi, Activity, Clock, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DeviceCardProps {
  deviceId: string;
  name: string;
  building: string;
  topic: string;
  status: 'online' | 'offline';
  lastSeen: string;
}

export function DeviceCard({ deviceId, name, building, topic, status, lastSeen }: DeviceCardProps) {
  const navigate = useNavigate();
  const isOnline = status === 'online';

  return (
    <div 
      onClick={() => navigate(`/devices/${deviceId}`)}
      className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-50 -z-10 group-hover:scale-110 transition-transform duration-500" />
      
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-colors",
            isOnline ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"
          )}>
            <Server size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">{name}</h3>
            <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
              <span className="truncate max-w-[120px]">{deviceId}</span>
            </p>
          </div>
        </div>
        
        <div className={cn(
          "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm",
          isOnline ? "bg-emerald-50 text-emerald-600 border border-emerald-200/50" : "bg-rose-50 text-rose-600 border border-rose-200/50"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
          {status}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 border border-gray-100 group-hover:bg-white group-hover:border-blue-100 transition-colors">
          <div className="flex items-center gap-2 text-gray-500">
            <Activity size={16} />
            <span className="text-xs font-medium uppercase tracking-wider">Building</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">{building}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 border border-gray-100 group-hover:bg-white group-hover:border-blue-100 transition-colors">
          <div className="flex items-center gap-2 text-gray-500">
            <Wifi size={16} />
            <span className="text-xs font-medium uppercase tracking-wider">Topic</span>
          </div>
          <span className="font-bold text-gray-900 text-sm truncate max-w-[150px]" title={topic}>{topic || 'N/A'}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 border border-gray-100 group-hover:bg-white group-hover:border-blue-100 transition-colors">
          <div className="flex items-center gap-2 text-gray-500">
            <Clock size={16} />
            <span className="text-xs font-medium uppercase tracking-wider">Last Update</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">
            {new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
