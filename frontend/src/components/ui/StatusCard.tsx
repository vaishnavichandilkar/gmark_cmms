import React from 'react';
import { motion } from 'framer-motion';
import type { IconType } from 'react-icons';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: IconType;
  status: 'healthy' | 'warning' | 'error' | 'neutral';
  subtitle?: string;
  className?: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({ title, value, icon: Icon, status, subtitle, className }) => {
  const statusColors = {
    healthy: 'text-green-500 bg-green-500/10 border-green-500/20',
    warning: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    error: 'text-red-500 bg-red-500/10 border-red-500/20',
    neutral: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  };

  const indicatorColors = {
    healthy: 'bg-green-500',
    warning: 'bg-orange-500',
    error: 'bg-red-500',
    neutral: 'bg-blue-500'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-5 shadow-lg",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-400">{title}</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
            {subtitle && <span className="text-xs font-medium text-slate-500">{subtitle}</span>}
          </div>
        </div>
        
        <div className={cn("p-3 rounded-lg border", statusColors[status])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {/* Status Indicator line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
        <motion.div 
          className={cn("h-full", indicatorColors[status])}
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      
      {/* Pulse effect if error */}
      {status === 'error' && (
        <div className="absolute top-2 right-2 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </div>
      )}
    </motion.div>
  );
};
