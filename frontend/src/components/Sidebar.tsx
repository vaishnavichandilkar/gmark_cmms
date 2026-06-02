import { 
  LayoutDashboard, Building2, Cpu, Wifi, Activity, BellRing, 
  FileText, TrendingUp, Users, Settings, ScrollText, ChevronDown 
} from 'lucide-react';

export function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-gray-100 h-screen flex flex-col fixed left-0 top-0 overflow-y-auto z-50">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
          <Building2 size={24} />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-lg leading-tight">Gera Imperium</h2>
          <p className="text-[11px] text-gray-500 font-medium">IoT BMS Platform</p>
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="bg-blue-50 text-blue-700 rounded-xl px-4 py-3 flex items-center gap-3 font-semibold mb-6 shadow-sm">
          <LayoutDashboard size={20} />
          <span className="text-sm">Overview</span>
        </div>

        <div className="space-y-6">
          {/* MONITORING */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-3 px-2 tracking-wider">MONITORING</p>
            <div className="space-y-0.5">
              {[
                { icon: <Building2 size={18} />, label: 'Buildings' },
                { icon: <Cpu size={18} />, label: 'Systems' },
                { icon: <Wifi size={18} />, label: 'Devices' },
                { icon: <Activity size={18} />, label: 'Live Data' },
                { icon: <BellRing size={18} />, label: 'Alarms' },
              ].map((item, i) => (
                <button key={i} className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium text-sm">
                  <span className="text-gray-400">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
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
                <button key={i} className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium text-sm">
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
                <button key={i} className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium text-sm">
                  <span className="text-gray-400">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto p-4 mb-4">
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-white shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
            AM
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900 leading-tight">Admin User</h4>
            <p className="text-[11px] text-gray-500">Super Admin</p>
          </div>
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}
