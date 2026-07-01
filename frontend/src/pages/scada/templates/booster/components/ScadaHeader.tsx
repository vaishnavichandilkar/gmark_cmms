import React, { useState } from 'react';
import { ArrowLeft, Bell, Settings, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../../../../store/slices/authSlice';
import { LogoutConfirmModal } from '../../../../../components/LogoutConfirmModal';

interface ScadaHeaderProps {
  title: string;
}

export const ScadaHeader: React.FC<ScadaHeaderProps> = ({ title }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogoutConfirm = () => {
    setIsModalOpen(false);
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-6 gap-4">
      {/* Left side: Back button and Title/Status in separate floating containers */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button 
          onClick={() => navigate(-1)}
          className="w-11 h-11 liquid-glass rounded-full text-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex items-center gap-4 px-6 py-2.5 liquid-glass rounded-[24px] flex-1 sm:flex-initial">
          <h1 className="text-lg md:text-xl font-bold text-white tracking-wider uppercase truncate max-w-[200px] md:max-w-none">
            {title}
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-[#30D158]/10 rounded-full border border-[#30D158]/20 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse"></div>
            <span className="text-[#30D158] text-[9px] font-bold tracking-widest">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Right side: Last Updated and control actions in separate floating containers */}
      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
        <div className="flex items-center gap-2 px-5 py-2.5 liquid-glass rounded-[24px] text-sm text-[rgba(255,255,255,0.75)]">
          <Clock size={16} className="text-[rgba(255,255,255,0.45)] shrink-0" />
          <span className="whitespace-nowrap">Last Updated: <strong className="text-white font-semibold">2 sec ago</strong></span>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <button className="relative w-11 h-11 liquid-glass rounded-full text-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center">
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#FF453A] rounded-full border border-black animate-pulse"></span>
          </button>
          
          <button className="w-11 h-11 liquid-glass rounded-full text-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center">
            <Settings size={20} />
          </button>

          {/* Logout Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 liquid-glass px-4 py-2.5 rounded-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Logout</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};
