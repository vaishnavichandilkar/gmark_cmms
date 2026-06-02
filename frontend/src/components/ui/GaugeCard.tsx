import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from './StatusCard';

interface GaugeCardProps {
  title: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  color?: string;
  className?: string;
}

export const GaugeCard: React.FC<GaugeCardProps> = ({ 
  title, 
  value, 
  min = 0, 
  max = 100, 
  unit = '', 
  color = '#10b981',
  className 
}) => {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  
  const data = [
    { name: 'Value', value: percentage, fill: color }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-4 shadow-lg",
        className
      )}
    >
      <h3 className="text-sm font-medium text-slate-400 mb-2">{title}</h3>
      <div className="relative w-full h-32 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            cx="50%" 
            cy="100%" 
            innerRadius="70%" 
            outerRadius="100%" 
            barSize={10} 
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: '#1e293b' }}
              dataKey="value"
              cornerRadius={5}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className="text-2xl font-bold text-white">{value}</span>
          <span className="text-xs text-slate-500">{unit}</span>
        </div>
      </div>
    </motion.div>
  );
};
