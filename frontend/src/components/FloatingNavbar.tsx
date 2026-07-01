import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Settings, Building2, AlertCircle, User } from 'lucide-react';
import type { RootState } from '../store';

export function FloatingNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated || !user) return null;

  const tabs: { label: string; path: string; icon: React.ReactNode; activeColor: string }[] = [];

  // Admin access
  if (user.role === 'SUPER_ADMIN' || user.role === 'SOCIETY_ADMIN') {
    tabs.push({
      label: 'Admin',
      path: '/admin',
      icon: <Settings size={22} />,
      activeColor: 'from-blue-500/25 to-indigo-500/25 text-blue-300 border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
    });
  }

  // General tabs
  tabs.push({
    label: 'Societies',
    path: '/',
    icon: <Building2 size={22} />,
    activeColor: 'from-teal-500/25 to-cyan-500/25 text-teal-300 border-teal-400/50 shadow-[0_0_20px_rgba(20,184,166,0.3)]'
  });
  tabs.push({
    label: 'Alerts',
    path: '/devices',
    icon: <AlertCircle size={22} />,
    activeColor: 'from-red-500/25 to-rose-500/25 text-red-300 border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
  });
  tabs.push({
    label: 'Profile',
    path: '/profile',
    icon: <User size={22} />,
    activeColor: 'from-violet-500/25 to-fuchsia-500/25 text-violet-300 border-violet-400/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
  });

  // Resolve active index dynamically
  let activeIndex = tabs.findIndex((tab) => {
    if (tab.path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/society') || location.pathname.startsWith('/building');
    }
    return location.pathname.startsWith(tab.path);
  });

  if (activeIndex === -1) activeIndex = 0;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 select-none">
      <div className="backdrop-blur-2xl bg-[#090a0e]/98 border border-white/20 rounded-[36px] p-2 flex items-center gap-1.5 shadow-[0_24px_50px_rgba(0,0,0,0.95)]">
        {tabs.map((tab, i) => {
          const isActive = activeIndex === i;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex items-center justify-center h-14 transition-all duration-300 focus:outline-none cursor-pointer"
            >
              {isActive ? (
                <motion.div
                  layoutId="activeTabPill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className={`h-full flex items-center gap-2.5 px-6 py-3.5 rounded-[28px] bg-gradient-to-r border ${tab.activeColor}`}
                >
                  <span className="shrink-0">{tab.icon}</span>
                  <span className="text-[13px] font-bold uppercase tracking-wider whitespace-nowrap">
                    {tab.label}
                  </span>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center w-16 h-full text-zinc-400 hover:text-white transition-colors duration-200">
                  {tab.icon}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
