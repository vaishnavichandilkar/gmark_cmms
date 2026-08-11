import { motion } from 'framer-motion';
import { 
  Droplet, Building2, AlertCircle, 
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DashboardHub() {
  const navigate = useNavigate();

  const iotModules = [
    {
      id: 'HYPN',
      label: 'HYPN System',
      icon: <Droplet size={24} className="text-blue-600" />,
      color: 'bg-blue-50',
      description: 'Manage hydrostatic pressure nodes and active alerts.',
      children: [
        { label: 'Societies', icon: <Building2 size={18} />, path: '/societies' },
        { label: 'Alerts', icon: <AlertCircle size={18} />, path: '/devices' },
      ]
    }
  ];

  return (
    <div className="h-full flex flex-col p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Command Center</h1>
        <p className="text-gray-500">Select a module to monitor systems or manage configurations.</p>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        <motion.div
          key="iot"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {iotModules.map((mod) => (
            <div 
              key={mod.id} 
              className={`bg-white rounded-2xl p-6 border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mod.color}`}>
                  {mod.icon}
                </div>
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
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
