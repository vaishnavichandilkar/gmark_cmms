import React from 'react';
import { ArrowLeft, Bell, Settings, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScadaHeaderProps {
  title: string;
}

export const ScadaHeader: React.FC<ScadaHeaderProps> = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between w-full p-4 bg-[#062B5B] shadow-[0_10px_30px_rgba(0,0,0,0.25)] rounded-[20px] mb-6 border border-[rgba(255,255,255,0.08)]">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-[#021B3A] rounded-lg border border-[rgba(255,255,255,0.08)] hover:bg-[#072B58] transition-colors text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-wider uppercase">
          {title}
        </h1>
        <div className="flex items-center gap-2 px-3 py-1 bg-[#021B3A] rounded-full border border-[rgba(255,255,255,0.08)] ml-4">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-green-500 text-xs font-bold tracking-widest">ONLINE</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-[#021B3A] rounded-lg border border-[rgba(255,255,255,0.08)] text-white text-sm">
          <Clock size={16} className="text-gray-400" />
          <span className="text-gray-300">Last Updated: <strong className="text-white">2 sec ago</strong></span>
        </div>
        
        <button className="relative p-2 bg-[#021B3A] rounded-lg border border-[rgba(255,255,255,0.08)] hover:bg-[#072B58] transition-colors text-white">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#062B5B]"></span>
        </button>
        
        <button className="p-2 bg-[#021B3A] rounded-lg border border-[rgba(255,255,255,0.08)] hover:bg-[#072B58] transition-colors text-white">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
};
