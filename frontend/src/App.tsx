import React from 'react';
import { useSocket } from './hooks/useSocket';
import { TopNavbar } from './components/dashboard/TopNavbar';
import { Sidebar } from './components/dashboard/Sidebar';
import { LiveStatusGrid } from './components/dashboard/LiveStatusGrid';
import { RealTimeGauges } from './components/dashboard/RealTimeGauges';
import { MotorMonitoring } from './components/dashboard/MotorMonitoring';
import { FaultMonitoringPanel } from './components/dashboard/FaultMonitoringPanel';
import { RealTimeCharts } from './components/dashboard/RealTimeCharts';
import { RegisterTable } from './components/dashboard/RegisterTable';
import { useMqttStore } from './store/useMqttStore';
import { useFaultVoiceAlert } from './hooks/useFaultVoiceAlert';
import { ToastContainer } from './components/ui/ToastContainer';
import { detectFaults } from './utils/faultDetector';
import { motion } from 'framer-motion';

const App: React.FC = () => {
  // Initialize socket connection and listeners
  useSocket();

  // Run real-time SCADA voice alerts hook
  useFaultVoiceAlert();
  
  const { activeTab, parsedData } = useMqttStore();
  const { hasFault } = detectFaults(parsedData);

  const renderContent = () => {
    switch (activeTab) {
      case 'Motors':
        return (
          <div className="space-y-6 animate-fade-in">
            <MotorMonitoring />
          </div>
        );
      case 'Power & Voltage':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Power & Supply Diagnostics</h2>
              <RealTimeGauges />
            </div>
            <RealTimeCharts />
          </div>
        );
      case 'Water System':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Water System Telemetry</h2>
              <LiveStatusGrid />
            </div>
          </div>
        );
      case 'Faults':
        return (
          <div className="space-y-6 animate-fade-in">
            <FaultMonitoringPanel />
          </div>
        );
      case 'Register Monitor':
        return (
          <div className="space-y-6 animate-fade-in">
            <RegisterTable />
          </div>
        );
      case 'Settings':
        return (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-4">System Settings</h2>
            <p className="text-slate-400">Configure write commands and operational thresholds here.</p>
            <div className="mt-4 p-4 border border-slate-800 bg-slate-950 rounded-lg max-w-md">
              <span className="text-sm font-semibold text-slate-300 block mb-2">Write Commands Mapping</span>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>Register 94: Motor Auto/Manual</li>
                <li>Register 39: Motor 1 ON/OFF</li>
                <li>Register 40: Motor 2 ON/OFF</li>
                <li>Register 41: Motor 3 ON/OFF</li>
              </ul>
            </div>
          </div>
        );
      case 'Overview':
      default:
        return (
          <>
            <LiveStatusGrid />
            <RealTimeGauges />
            <FaultMonitoringPanel />
            <MotorMonitoring />
            <RealTimeCharts />
            <div className="pt-4">
              <RegisterTable />
            </div>
          </>
        );
    }
  };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 relative">
      <TopNavbar />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6 lg:p-8 overflow-auto h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto space-y-6">
            <header>
              <h1 className="text-3xl font-bold text-white tracking-tight">{activeTab}</h1>
              <p className="text-slate-400 mt-1">Real-time telemetry and control for Variable Speed HYPN Panel BMS.</p>
            </header>

            {renderContent()}
          </div>
        </main>
      </div>

      {/* Floating dynamic system toast notices */}
      <ToastContainer />

      {/* Ambient Red SCADA Warning Pulse Overlay */}
      {hasFault && (
        <motion.div
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="fixed inset-0 border-[6px] border-red-500/30 pointer-events-none z-45"
        />
      )}
    </div>
  );
};

export default App;
