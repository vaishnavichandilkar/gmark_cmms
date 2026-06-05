import type { Building } from '../types';
import { motion } from 'framer-motion';
import { Building2, Settings2, Wifi, WifiOff, ShieldAlert, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import buildingA from '../assets/building/building A.png';
import buildingB from '../assets/building/building B.png';
import buildingC from '../assets/building/building  C.png';
import stp from '../assets/building/STP.png';

interface BuildingCardProps {
  building: Building;
}

const images: Record<string, string> = {
  '1': buildingA,
  '2': buildingB,
  '3': buildingC,
  '4': stp,
  a: buildingA,
  b: buildingB,
  c: buildingC,
  stp: stp,
};

const styles = {
  '1': { iconBg: 'bg-blue-600', text: 'text-blue-600' },
  '2': { iconBg: 'bg-emerald-600', text: 'text-emerald-600' },
  '3': { iconBg: 'bg-purple-500', text: 'text-purple-500' },
  '4': { iconBg: 'bg-teal-500', text: 'text-teal-500' },
  a: { iconBg: 'bg-blue-600', text: 'text-blue-600' },
  b: { iconBg: 'bg-emerald-600', text: 'text-emerald-600' },
  c: { iconBg: 'bg-purple-500', text: 'text-purple-500' },
  stp: { iconBg: 'bg-teal-500', text: 'text-teal-500' },
};

export function BuildingCard({ building }: BuildingCardProps) {
  const navigate = useNavigate();
  
  const status = building.healthPercentage === 100 
    ? 'healthy' 
    : building.healthPercentage > 90 
      ? 'warning' 
      : 'critical';

  const statusConfig = {
    healthy: { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Healthy', bar: 'bg-emerald-500' },
    warning: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', label: 'Warning', bar: 'bg-amber-500' },
    critical: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', label: 'Critical', bar: 'bg-red-500' },
  }[status];

  const style = styles[building.id as keyof typeof styles] || styles.a;

  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 25 
      }}
      onClick={() => navigate(`/building/${building.id}`)}
      className="bg-white rounded-[24px] p-6 shadow-sm hover:shadow-2xl border border-gray-100 flex flex-col relative overflow-hidden group cursor-pointer transition-[box-shadow,border-color] duration-150"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${style.iconBg}`}>
            <Building2 size={18} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{building.name}</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bg}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
          <span className={`text-[10px] font-bold ${statusConfig.text}`}>{statusConfig.label}</span>
        </div>
      </div>

      {/* Image */}
      <div className="h-40 w-full mb-4 flex items-center justify-center">
        <img src={images[building.id]} alt={building.name} className="h-full object-contain mix-blend-multiply" />
      </div>

      {/* Timestamp */}
      <div className="flex items-center justify-center gap-2 bg-blue-50/50 py-2 rounded-lg mb-6">
        <Clock size={12} className="text-gray-400" />
        <span className="text-[11px] font-medium text-gray-500">
          Last updated: {new Date(building.lastUpdated).toLocaleTimeString()}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <Settings2 size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-tight">Devices</span>
            <span className="text-lg font-extrabold text-gray-900 leading-tight">{building.deviceCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
            <Wifi size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-tight">Online</span>
            <span className="text-lg font-extrabold text-emerald-500 leading-tight">{building.onlineDevices}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
            <WifiOff size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-tight">Offline</span>
            <span className="text-lg font-extrabold text-gray-900 leading-tight">{building.offlineDevices}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
            <ShieldAlert size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-tight">Faults</span>
            <span className="text-lg font-extrabold text-red-500 leading-tight">{building.activeFaults}</span>
          </div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="mt-auto mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-bold text-gray-500 uppercase">Health</span>
          <span className={`text-sm font-bold ${statusConfig.text}`}>{building.healthPercentage}%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${building.healthPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${statusConfig.bar}`}
          />
        </div>
      </div>

      <div className="h-px w-full bg-gray-100 mb-4" />

      {/* Footer link */}
      <div 
        className="flex justify-center items-center gap-2 text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors w-full py-2"
      >
        View Details <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform duration-300" />
      </div>
    </motion.div>
  );
}
