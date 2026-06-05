import React from 'react';
import { DeviceHeader } from './DeviceHeader';
import { MetricCard } from './MetricCard';
import { GaugeCard } from './GaugeCard';
import { DeviceFooter } from './DeviceFooter';
import type { Device } from '../../types';

interface DeviceCardProps {
  device: Device;
}

// Icons for dynamic rendering without relying on external prop-passing
const RunningIcon = () => (
  <svg xmlns="http://www.w3.org/-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
    <line x1="12" y1="2" x2="12" y2="12"></line>
  </svg>
);

const PanelIcon = () => (
  <svg xmlns="http://www.w3.org/-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <path d="M9 21V9"></path>
    <circle cx="6" cy="15" r="1"></circle>
    <circle cx="15" cy="15" r="1"></circle>
    <circle cx="15" cy="18" r="1"></circle>
  </svg>
);

const VoltageIcon = () => (
  <svg xmlns="http://www.w3.org/-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const CurrentIcon = () => (
  <svg xmlns="http://www.w3.org/-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22v-5"></path>
    <path d="M9 8V2"></path>
    <path d="M15 8V2"></path>
    <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"></path>
  </svg>
);

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
  const { name, status, latestData } = device;

  // Derive border color based on status
  const getBorderColor = () => {
    switch (status) {
      case 'ONLINE':
      case 'RUNNING':
        return 'border-green-400';
      case 'OFFLINE':
      case 'FAULT':
        return 'border-red-400';
      case 'WARNING':
        return 'border-orange-400';
      default:
        return 'border-gray-200';
    }
  };

  const isRunning = latestData.runningState === 'RUNNING' || latestData.runningState === 'ON';
  const runningColor = isRunning ? 'text-green-500' : 'text-red-500';
  
  const isAuto = latestData.panelWorkMode === 'AUTO';
  const panelColor = isAuto ? 'text-blue-500' : 'text-green-500';

  return (
    <div className={`bg-white rounded-[2rem] p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow border-2 ${getBorderColor()}`}>
      <DeviceHeader name={name} status={status} faults={latestData.faults} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column (Metrics) */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard 
              icon={<span className={runningColor}><RunningIcon /></span>}
              label="Running State"
              value={latestData.runningState}
              valueColor={runningColor}
            />
            <MetricCard 
              icon={<span className="text-blue-500"><PanelIcon /></span>}
              label="Panel Work On"
              value={latestData.panelWorkMode}
              valueColor={panelColor}
            />
          </div>
          
          <MetricCard 
            icon={<span className="text-yellow-400"><VoltageIcon /></span>}
            label="Voltage (V)"
            value={latestData.voltage}
            unit="V"
          />
          
          <MetricCard 
            icon={<span className="text-purple-500"><CurrentIcon /></span>}
            label="Current (A)"
            value={latestData.current.toFixed(1)}
            unit="A"
          />
        </div>

        {/* Right Column (Gauge) */}
        <GaugeCard 
          value={latestData.pressure} 
          label="Pressure (bar)"
          unit="bar"
        />
      </div>

      <DeviceFooter timestamp={latestData.timestamp} />
    </div>
  );
};
