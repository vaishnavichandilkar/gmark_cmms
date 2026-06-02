import React from 'react';
import { LayoutDashboard, Activity, Zap, Droplet, AlertTriangle, List, Settings } from 'lucide-react';

import { useMqttStore } from '../../store/useMqttStore';

const menuItems = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: Activity, label: 'Motors' },
  { icon: Zap, label: 'Power & Voltage' },
  { icon: Droplet, label: 'Water System' },
  { icon: AlertTriangle, label: 'Faults' },
  { icon: List, label: 'Register Monitor' },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useMqttStore();

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col h-[calc(100vh-4rem)] sticky top-16 hidden lg:flex">
      <div className="flex-1 py-6 px-4 flex flex-col gap-2">
        {menuItems.map((item, index) => {
          const isActive = activeTab === item.label;
          return (
            <button
              key={index}
              onClick={() => setActiveTab(item.label)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              {item.label}
            </button>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => setActiveTab('Settings')}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium w-full ${
            activeTab === 'Settings'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
          }`}
        >
          <Settings className={`w-5 h-5 ${activeTab === 'Settings' ? 'text-emerald-400' : 'text-slate-500'}`} />
          System Settings
        </button>
      </div>
    </aside>
  );
};
