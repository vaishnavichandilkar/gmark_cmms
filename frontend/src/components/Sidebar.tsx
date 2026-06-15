import { 
  LayoutDashboard, Building2, Cpu, Wifi, Activity, BellRing, 
  FileText, TrendingUp, Users, Settings, ScrollText, ChevronDown, X 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isOverviewActive = location.pathname === '/';

  return (
    <div className={`w-64 bg-black border-r border-white/10 h-screen flex flex-col fixed left-0 top-0 overflow-y-auto z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
          <Building2 size={24} />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-white text-lg leading-tight">Gera Imperium</h2>
          <p className="text-[11px] text-gray-400 font-medium">IoT BMS Platform</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 ml-auto transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="px-4 py-2">
        <button
          onClick={() => {
            navigate('/');
            if (onClose) onClose();
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold mb-6 shadow-sm border transition-all text-left ${
            isOverviewActive 
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/10' 
              : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="text-sm">Overview</span>
        </button>

        <div className="space-y-6">
          {/* MONITORING */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-3 px-2 tracking-wider">MONITORING</p>
            <div className="space-y-0.5">
              {[
                { icon: <Building2 size={18} />, label: 'Buildings', path: '/add-building' },
                { icon: <Cpu size={18} />, label: 'Systems', path: '/' },
                { icon: <Wifi size={18} />, label: 'Devices', path: '/devices' },
                { icon: <Activity size={18} />, label: 'Live Data', path: '/' },
                { icon: <BellRing size={18} />, label: 'Alarms', path: '/' },
              ].map((item, i) => {
                const isActive = location.pathname === item.path;
                return (
                  <button 
                    key={i} 
                    onClick={() => {
                      navigate(item.path);
                      if (onClose) onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-sm text-left ${
                      isActive 
                        ? 'bg-white/10 text-white font-bold' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className={isActive ? 'text-blue-400' : 'text-gray-400'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ANALYTICS */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-3 px-2 tracking-wider">ANALYTICS</p>
            <div className="space-y-0.5">
              {[
                { icon: <FileText size={18} />, label: 'Reports' },
                { icon: <TrendingUp size={18} />, label: 'Trends' },
              ].map((item, i) => (
                <button key={i} className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium text-sm">
                  <span className="text-gray-400">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* MANAGEMENT */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-3 px-2 tracking-wider">MANAGEMENT</p>
            <div className="space-y-0.5">
              {[
                { icon: <Users size={18} />, label: 'Users' },
                { icon: <Settings size={18} />, label: 'Settings' },
                { icon: <ScrollText size={18} />, label: 'Audit Logs' },
              ].map((item, i) => (
                <button key={i} className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium text-sm">
                  <span className="text-gray-400">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto p-4 mb-4">
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-white/5 shadow-sm cursor-pointer hover:bg-white/10 transition-colors">
          <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
            AM
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white leading-tight">Admin User</h4>
            <p className="text-[11px] text-gray-400">Super Admin</p>
          </div>
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}
