import React from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { cn } from './StatusCard';

interface MotorCardProps {
  name: string;
  isOn: boolean;
  runtime: number; // in minutes or seconds based on map
  currentR: number;
  currentY: number;
  currentB: number;
}

export const MotorCard: React.FC<MotorCardProps> = ({ name, isOn, runtime, currentR, currentY, currentB }) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-5 shadow-lg flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("w-2 h-2 rounded-full", isOn ? "bg-green-500" : "bg-slate-500")} />
            <span className={cn("text-xs font-medium", isOn ? "text-green-400" : "text-slate-400")}>
              {isOn ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
        </div>
        <div className={cn("p-2 rounded-lg bg-slate-800", isOn ? "text-green-400" : "text-slate-500")}>
          <motion.div
            animate={{ rotate: isOn ? 360 : 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Settings className="w-8 h-8" />
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-auto">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <span className="text-[10px] text-slate-400 uppercase">Runtime</span>
          <p className="text-lg font-bold text-slate-200">{runtime} <span className="text-xs font-normal">min</span></p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <span className="text-[10px] text-slate-400 uppercase">Avg Current</span>
          <p className="text-lg font-bold text-slate-200">
            {Math.round((currentR + currentY + currentB) / 3)} <span className="text-xs font-normal">A</span>
          </p>
        </div>
      </div>
      
      <div className="flex justify-between mt-3 text-xs text-slate-400 bg-slate-800/30 rounded px-2 py-1">
        <span>R: <b className="text-slate-300">{currentR}A</b></span>
        <span>Y: <b className="text-slate-300">{currentY}A</b></span>
        <span>B: <b className="text-slate-300">{currentB}A</b></span>
      </div>
    </div>
  );
};
