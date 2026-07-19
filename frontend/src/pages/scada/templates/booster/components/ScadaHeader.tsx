import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Settings, LogOut, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../../../../store/slices/authSlice';
import { LogoutConfirmModal } from '../../../../../components/LogoutConfirmModal';

interface ScadaHeaderProps {
  title: string;
  isOnline?: boolean;
}

export const ScadaHeader: React.FC<ScadaHeaderProps> = ({ title, isOnline = true }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogoutConfirm = () => {
    setIsModalOpen(false);
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div 
      className="flex items-center justify-between w-full px-4 rounded-[18px] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
      style={{ height: '60px', backgroundColor: '#101010', flexShrink: 0 }}
    >
      {/* LEFT */}
      <div className="flex items-center gap-4 h-full">
        <button 
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#00D4FF] flex items-center justify-center text-black font-bold text-[10px]">
            H
          </div>
          <h1 className="text-[13px] font-[600] text-white tracking-wider uppercase">
            {title}
          </h1>
        </div>

        <div className="h-6 w-[1px] bg-white/10 mx-2"></div>

        <div className={`flex items-center gap-2 px-2 py-1 rounded border ${isOnline ? 'bg-[#00FF95]/10 border-[#00FF95]/20' : 'bg-[#FF4D4D]/10 border-[#FF4D4D]/20'}`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-[#00FF95]' : 'bg-[#FF4D4D]'}`}></div>
          <span className={`text-[11px] font-[500] tracking-widest uppercase ${isOnline ? 'text-[#00FF95]' : 'text-[#FF4D4D]'}`}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4 h-full">
        <div className="flex flex-col items-end justify-center">
          <span className="text-[11px] font-[500] text-[#AAAAAA]">
            {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className="text-[13px] font-[600] text-[#00D4FF]">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>

        <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

        <div className="flex items-center gap-2 text-[#AAAAAA]">
          <Wifi size={14} className="text-[#00FF95]" />
          <span className="text-[11px] font-[500]">Connected</span>
        </div>

        <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

        <div className="flex items-center gap-2">
          <button className="relative w-8 h-8 rounded bg-white/5 border border-white/10 text-[#AAAAAA] hover:text-white transition-colors flex items-center justify-center cursor-pointer">
            <Bell size={14} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF4D4D] rounded-full"></span>
          </button>
          
          <button className="w-8 h-8 rounded bg-white/5 border border-white/10 text-[#AAAAAA] hover:text-white transition-colors flex items-center justify-center cursor-pointer">
            <Settings size={14} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 h-8 rounded bg-white/5 border border-white/10 text-[#AAAAAA] hover:text-[#FF4D4D] hover:bg-[#FF4D4D]/10 hover:border-[#FF4D4D]/30 transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span className="text-[11px] font-[500] uppercase">Logout</span>
          </button>
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};
