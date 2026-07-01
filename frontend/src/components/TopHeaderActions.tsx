import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Activity, Clock, Bell, Maximize, LogOut } from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import { LogoutConfirmModal } from './LogoutConfirmModal';

export function TopHeaderActions() {
  const [time, setTime] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

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
    <div className="flex flex-wrap items-center gap-3">
      {/* Time Widget */}
      <div className="hidden sm:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full shadow-sm border border-white/10">
        <Clock size={18} className="text-blue-500" />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white leading-tight">
            {time.toLocaleTimeString()}
          </span>
          <span className="text-[10px] font-medium text-gray-400 uppercase">
            {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>
      
      {/* MQTT Widget */}
      <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-full shadow-sm border border-white/10">
        <div className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white leading-tight">MQTT</span>
          <span className="text-[10px] font-bold text-emerald-500">Connected</span>
        </div>
      </div>

      {/* System Widget */}
      <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-full shadow-sm border border-white/10">
        <Activity size={18} className="text-emerald-500" />
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white leading-tight">System</span>
          <span className="text-[10px] font-bold text-emerald-500">Online</span>
        </div>
      </div>

      {/* Bell */}
      <button className="relative w-11 h-11 bg-white/5 rounded-full flex items-center justify-center shadow-sm border border-white/10 hover:bg-white/10 transition-colors text-gray-400 hover:text-white cursor-pointer">
        <Bell size={20} />
        <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
          3
        </span>
      </button>

      {/* Fullscreen */}
      <button className="hidden sm:flex w-11 h-11 bg-white/5 rounded-full items-center justify-center shadow-sm border border-white/10 hover:bg-white/10 transition-colors text-gray-400 hover:text-white cursor-pointer">
        <Maximize size={18} />
      </button>

      {/* Logout button with Text */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-full shadow-sm border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
      >
        <LogOut size={16} />
        <span className="text-[11px] font-bold uppercase tracking-wider">Logout</span>
      </button>

      {/* Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}
