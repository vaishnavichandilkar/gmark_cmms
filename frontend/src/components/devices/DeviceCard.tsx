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
      className={cn(
        "group rounded-[24px] p-6 border shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 cursor-pointer relative overflow-hidden",
        isOnline ? "liquid-glass-active border-emerald-500/30 hover:border-emerald-400/50" : "liquid-glass-inactive border-white/5 hover:border-white/20"
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-50 -z-10 group-hover:scale-110 transition-transform duration-500" />

      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-colors backdrop-blur-md",
            isOnline ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-black/40 text-[rgba(255,255,255,0.45)] border border-white/5"
          )}>
            <Server size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight group-hover:text-teal-400 transition-colors">{name}</h3>
            <p className="text-sm font-medium text-[rgba(255,255,255,0.45)] flex items-center gap-1">
              <span className="truncate max-w-[120px]">{deviceId}</span>
            </p>
          </div>
        </div>

        <div className={cn(
          "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-md",
          isOnline ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-500")} />
          {status}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 group-hover:bg-white/5 group-hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 text-[rgba(255,255,255,0.45)]">
            <Activity size={16} />
            <span className="text-xs font-medium uppercase tracking-wider">Building</span>
          </div>
          <span className="font-bold text-white text-sm">{building}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 group-hover:bg-white/5 group-hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 text-[rgba(255,255,255,0.45)]">
            <Wifi size={16} />
            <span className="text-xs font-medium uppercase tracking-wider">Topic</span>
          </div>
          <span className="font-bold text-white text-sm truncate max-w-[150px]" title={topic}>{topic || 'N/A'}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 group-hover:bg-white/5 group-hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 text-[rgba(255,255,255,0.45)]">
            <Clock size={16} />
            <span className="text-xs font-medium uppercase tracking-wider">Last Update</span>
          </div>
          <span className="font-bold text-white text-sm">
            {new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
