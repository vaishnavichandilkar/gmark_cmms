import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface KpiCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  subtitle: string;
  colorScheme: 'blue' | 'green' | 'purple' | 'red';
  subtitleColor: string;
}

export function KpiCard({ title, value, icon, subtitle, colorScheme, subtitleColor }: KpiCardProps) {
  const spring = useSpring(0, { bounce: 0, duration: 1000 });
  const displayValue = useTransform(spring, (current) => Math.round(current));
  
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const colorStyles = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-500",
  }[colorScheme];

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100 flex items-center gap-6">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${colorStyles}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <p className="text-[11px] font-bold text-gray-500 tracking-wider mb-1 uppercase">{title}</p>
        <motion.span className="text-4xl font-extrabold text-gray-900 leading-none mb-1">
          {displayValue}
        </motion.span>
        <p className={`text-[11px] font-bold ${subtitleColor}`}>{subtitle}</p>
      </div>
    </div>
  );
}
