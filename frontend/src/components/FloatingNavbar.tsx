import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Building2, AlertCircle, User } from 'lucide-react';

export function FloatingNavbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveIndex = (pathname: string) => {
    if (pathname === '/admin') return 0;
    if (pathname === '/devices' || pathname.startsWith('/devices/')) return 2;
    if (pathname === '/add-building') return 3;
    return 1; // Default to Societies (Overview)
  };

  const activeIndex = getActiveIndex(location.pathname);
  const X = (activeIndex * 105) + 52.5;

  const tabs = [
    { label: 'Admin', path: '/admin', icon: <Settings size={20} /> },
    { label: 'Societies', path: '/', icon: <Building2 size={20} /> },
    { label: 'Alerts', path: '/devices', icon: <AlertCircle size={20} className="text-red-500" /> },
    { label: 'Profile', path: '/add-building', icon: <User size={20} /> },
  ];

  // Dynamic SVG path for the capsule shape with a smooth concave notch/cut-out around the active tab center X
  // Adjusted curves (width = 80px, depth = 32px) and corner radius = 12px for a perfect fit
  const pathD = `
    M 12 24
    L ${X - 40} 24
    C ${X - 24} 24, ${X - 20} 56, ${X} 56
    C ${X + 20} 56, ${X + 24} 24, ${X + 40} 24
    L 408 24
    A 12 12 0 0 1 420 36
    L 420 84
    A 12 12 0 0 1 408 96
    L 12 96
    A 12 12 0 0 1 0 84
    L 0 36
    A 12 12 0 0 1 12 24
  `.replace(/\s+/g, ' ').trim();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[420px] h-[100px] select-none filter drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)] drop-shadow-[0_0_20px_rgba(59,130,246,0.12)]">
      {/* Dynamic Curved Glass Container */}
      <svg
        width="420"
        height="100"
        viewBox="0 0 420 100"
        className="absolute inset-0 z-10 backdrop-blur-xl"
      >
        <path
          d={pathD}
          fill="rgba(24, 24, 27, 0.95)"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1.2"
          style={{ transition: 'd 300ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>

      {/* Tabs Layout */}
      <div className="absolute top-[24px] left-0 w-[420px] h-[72px] z-20 flex items-center">
        {/* Active Protruding Circular Button */}
        <div
          className="absolute top-[-22px] w-14 h-14 rounded-full bg-zinc-950 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.35)] flex items-center justify-center transition-all duration-300 ease-out z-30 cursor-pointer hover:bg-zinc-900 active:scale-95"
          style={{ left: `${(activeIndex * 105) + 24.5}px` }}
          onClick={() => navigate(tabs[activeIndex].path)}
        >
          <div className="text-blue-400">
            {tabs[activeIndex].icon}
          </div>
        </div>

        {/* Regular Tabs */}
        {tabs.map((tab, i) => {
          const isActive = activeIndex === i;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="w-[105px] h-full flex flex-col items-center justify-center gap-1 cursor-pointer relative focus:outline-none"
            >
              {!isActive && (
                <>
                  <div className="text-zinc-400 hover:text-white transition-colors duration-200">
                    {tab.icon}
                  </div>
                  <span className="text-xs font-bold text-zinc-400 hover:text-white tracking-tight transition-colors duration-200">
                    {tab.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
