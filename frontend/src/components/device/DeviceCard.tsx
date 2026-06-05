import React from 'react';
import { DeviceHeader } from './DeviceHeader';
import { MetricCard } from './MetricCard';
import { GaugeCard } from './GaugeCard';
import { DeviceFooter } from './DeviceFooter';
import { useNavigate } from 'react-router-dom';
import type { Device } from '../../types';

interface DeviceCardProps {
  device: Device;
}

// Icons for dynamic rendering without relying on external prop-passing
const PanelIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 sm:w-6 sm:h-6">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <path d="M9 21V9"></path>
    <circle cx="6" cy="15" r="1"></circle>
    <circle cx="15" cy="15" r="1"></circle>
    <circle cx="15" cy="18" r="1"></circle>
  </svg>
);

const VoltageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 sm:w-6 sm:h-6">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const CurrentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 sm:w-6 sm:h-6">
    <path d="M12 22v-5"></path>
    <path d="M9 8V2"></path>
    <path d="M15 8V2"></path>
    <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"></path>
  </svg>
);

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
  const { name, status, latestData } = device;

  const isAuto = latestData.panelWorkMode === 'AUTO';
  const panelColor = isAuto ? 'text-blue-500' : 'text-green-500';

  const navigate = useNavigate();
  const isScada = name.includes('Flushing Terrace');

  return (
    <div
      className={`bg-white rounded-[2rem] p-6 md:p-8 shadow-sm transition-all border-2 ${getBorderColor()} ${isScada ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : 'hover:shadow-md'}`}
      onClick={() => isScada && navigate('/scada/flushing-terrace')}
    >
      <DeviceHeader name={name} status={status} faults={latestData.faults} />

      <div className="grid grid-cols-2 gap-2 sm:gap-6">
        {/* Left Column (Metrics) */}
        <div className="flex flex-col gap-4">
          <MetricCard
            icon={<span className="text-blue-500"><PanelIcon /></span>}
            label="Panel Work On"
            value={latestData.panelWorkMode}
            valueColor={panelColor}
          />

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
