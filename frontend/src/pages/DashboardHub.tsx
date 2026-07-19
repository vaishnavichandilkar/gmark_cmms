import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, Wrench, Droplet, Flame, ArrowUpDown, 
  MoreHorizontal, Users, Building2, AlertCircle, 
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DashboardHub() {
  const [activeTab, setActiveTab] = useState<'IOT' | 'CMMS'>('IOT');
  const navigate = useNavigate();

  const tabs = [
    { id: 'IOT', label: 'IOT Modules', icon: <Cpu size={18} /> },
    { id: 'CMMS', label: 'CMMS', icon: <Wrench size={18} /> },
  ] as const;

  const iotModules = [
    {
      id: 'HYPN',
      label: 'HYPN System',
      icon: <Droplet size={24} className="text-blue-600" />,
      color: 'bg-blue-50',
      description: 'Manage hydrostatic pressure nodes, users, and active alerts.',
      children: [
        { label: 'User Master', icon: <Users size={18} />, path: '/admin' },
        { label: 'Societies', icon: <Building2 size={18} />, path: '/' },
        { label: 'Alerts', icon: <AlertCircle size={18} />, path: '/devices' },
      ]
    },
    {
      id: 'Fire',
      label: 'Fire Safety',
      icon: <Flame size={24} className="text-orange-600" />,
      color: 'bg-orange-50',
      description: 'Fire alarm and suppression systems monitoring.',
      isComingSoon: true,
    },
    {
      id: 'Lift',
      label: 'Elevators',
      icon: <ArrowUpDown size={24} className="text-emerald-600" />,
      color: 'bg-emerald-50',
      description: 'Lift and elevator health and status monitoring.',
      isComingSoon: true,
    },
    {
      id: 'Etc',
      label: 'Other Systems',
      icon: <MoreHorizontal size={24} className="text-purple-600" />,
      color: 'bg-purple-50',
      description: 'Additional IoT modules and sensor networks.',
      isComingSoon: true,
    }
  ];

  return (
    <div className="h-full flex flex-col p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Command Center</h1>
        <p className="text-gray-500">Select a module to monitor systems or manage configurations.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 bg-gray-50 p-1.5 rounded-xl w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'IOT' | 'CMMS')}
              className={`relative flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors duration-200 ${
                isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="dashboardTabBg"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm border border-gray-100"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'IOT' && (
            <motion.div
              key="iot"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {iotModules.map((mod) => (
                <div 
                  key={mod.id} 
                  className={`bg-white rounded-2xl p-6 border border-gray-100 flex flex-col h-full ${mod.isComingSoon ? 'opacity-60' : 'hover:shadow-md transition-shadow'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mod.color}`}>
                      {mod.icon}
                    </div>
                    {mod.isComingSoon && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{mod.label}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed h-10">{mod.description}</p>
                  </div>

                  <div className="flex-1 mt-auto flex flex-col gap-2">
                    {mod.children && mod.children.map((child) => (
                      <button
                        key={child.label}
                        onClick={() => navigate(child.path)}
                        className="group flex items-center justify-between w-full p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                            {child.icon}
                          </div>
                          <span className="font-semibold text-sm">{child.label}</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                    
                    {mod.isComingSoon && (
                      <div className="w-full p-3.5 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center">
                        <span className="text-sm font-medium text-gray-400">Not Available</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'CMMS' && (
            <motion.div
              key="cmms"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full flex items-center justify-center min-h-[400px]"
            >
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wrench size={32} className="text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">CMMS Module</h3>
                <p className="text-gray-500 leading-relaxed">
                  Computerized Maintenance Management System features are currently in development.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
