import React from 'react';
import { DeviceHeader } from './DeviceHeader';
import { MetricCard } from './MetricCard';
import { GaugeCard } from './GaugeCard';
import { DeviceFooter } from './DeviceFooter';
import { useNavigate } from 'react-router-dom';
import type { Device } from '../../../types';

interface DeviceCardProps {
  device: Device;
  buildingName?: string;
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

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, buildingName }) => {
  const { name, status, latestData } = device;

  const isAuto = latestData.panelWorkMode === 'AUTO';
  const panelColor = isAuto ? 'text-blue-500' : 'text-green-500';

  const navigate = useNavigate();
  const lowerName = name.toLowerCase();
  const isFlushing = lowerName.includes('flushing terrace');
  const isDomestic = lowerName.includes('domestic terrace');
  const isTowerBDomestic = lowerName.includes('tower b domestic');
  const isTowerACDomestic = lowerName.includes('tower a&c domestic');
  const isTowerBFlushing = lowerName.includes('tower b flushing');
  const isTowerACFlushing = lowerName.includes('tower a&c flushing');
  const isGardenSystem = lowerName.includes('gardan system') || lowerName.includes('garden system');
  const isSubSoilPump01 = lowerName.includes('sub soil pump-01');
  const isSubSoilPump02 = lowerName.includes('sub soil pump-02');
  const isSubSoilPump03 = lowerName.includes('sub soil pump-03');
  const isSubSoilPump04 = lowerName.includes('sub soil pump-04');
  const isSumpPump01 = lowerName.includes('sump pump-01');
  const isSumpPump02 = lowerName.includes('sump pump-02');
  const isSumpPump03 = lowerName.includes('sump pump-03');
  const isSumpPump04 = lowerName.includes('sump pump-04');
  const isSumpPump05 = lowerName.includes('sump pump-05');
  const isSumpPump06 = lowerName.includes('sump pump-06');

  const isScada = isFlushing || isDomestic || isTowerBDomestic || isTowerACDomestic ||
    isTowerBFlushing || isTowerACFlushing || isGardenSystem ||
    isSubSoilPump01 || isSubSoilPump02 || isSubSoilPump03 || isSubSoilPump04 ||
    isSumpPump01 || isSumpPump02 || isSumpPump03 ||
    isSumpPump04 || isSumpPump05 || isSumpPump06;

  const getGlassStyle = () => {
    switch (status) {
      case 'ONLINE':
      case 'RUNNING': return 'bg-white border border-emerald-500/30';
      case 'WARNING': return 'bg-white border border-amber-500/30';
      case 'FAULT': return 'bg-white border border-red-500/30';
      case 'OFFLINE':
      default: return 'bg-white border border-gray-200';
    }
  };

  return (
    <div
      className={`rounded-[2rem] overflow-hidden ${getGlassStyle()} shadow-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-lg ${isScada ? 'cursor-pointer hover:border-[#00a651]/40' : ''}`}
      onClick={() => {
        if (!isScada) return;

        const lowerBuilding = (buildingName || '').toLowerCase();
        let p1Id = device.id;
        let p2Id = '';
        let p3Id = '';

        if (isFlushing) {
          if (lowerBuilding.includes('a building')) {
            p1Id = '20260508012';
            p2Id = '20260508045';
          } else if (lowerBuilding.includes('b building')) {
            p1Id = '2026050805';
            p2Id = '20260508011';
          } else {
            p1Id = '20260508010';
            p2Id = '20260526021';
          }
          p3Id = '20260506023';
        } else if (isDomestic) {
          if (lowerBuilding.includes('a building')) {
            p1Id = '20260508045';
            p2Id = '20260508012';
          } else if (lowerBuilding.includes('b building')) {
            p1Id = '20260508011';
            p2Id = '2026050805';
          } else {
            p1Id = '20260526021';
            p2Id = '20260508010';
          }
          p3Id = '20260506023';
        } else if (isTowerBDomestic) {
          p1Id = '20260508013';
          p2Id = '2026050805';
          p3Id = '20260506023';
        } else if (isTowerACDomestic) {
          p1Id = '20260526020';
          p2Id = '2026050805';
          p3Id = '20260506023';
        } else if (isTowerBFlushing) {
          p1Id = device.id;
          p2Id = '20260508011';
          p3Id = '20260506023';
        } else if (isTowerACFlushing) {
          p1Id = device.id;
          p2Id = '20260508011';
          p3Id = '20260506023';
        } else if (isGardenSystem) {
          p1Id = device.id;
          p2Id = '20260508011';
          p3Id = '20260506023';
        } else {
          p1Id = device.id;
          p2Id = '2026050805';
          p3Id = '20260506023';
        }

        const showPressure = !(
          isSubSoilPump01 || isSubSoilPump02 || isSubSoilPump03 || isSubSoilPump04 ||
          isSumpPump01 || isSumpPump02 || isSumpPump03 || isSumpPump04 || isSumpPump05 || isSumpPump06
        );

        const inletTank = (
          isSubSoilPump01 || isSubSoilPump02 || isSubSoilPump03 || isSubSoilPump04 ||
          isSumpPump01 || isSumpPump02 || isSumpPump03 || isSumpPump04 || isSumpPump05 || isSumpPump06
        )
          ? 'Underground Sump'
          : (isTowerBDomestic || isTowerACDomestic || isTowerBFlushing || isTowerACFlushing || isGardenSystem)
            ? 'Underground Tank'
            : 'Underground Tank';

        const outType = (isTowerBDomestic || isTowerACDomestic || isTowerBFlushing || isTowerACFlushing || isGardenSystem) ? 'tank' : 'label';
        const outTitle = (isTowerBDomestic || isTowerACDomestic || isTowerBFlushing || isTowerACFlushing || isGardenSystem) ? 'Overhead Tank' : 'OUTLET';

        const routeState = {
          panelId: device.id,
          buildingName: buildingName || (lowerName.includes('(stp)') ? 'STP' : 'C Building'),
          title: name,
          pump1Id: p1Id,
          pump2Id: p2Id,
          pump3Id: p3Id,
          showPressureCard: showPressure,
          inletTankTitle: inletTank,
          outletType: outType,
          outletTitle: outTitle,
        };

        if (isFlushing) navigate('/scada/flushing-terrace', { state: routeState });
        else if (isDomestic) navigate('/scada/domestic-terrace', { state: routeState });
        else if (isTowerBDomestic) navigate('/scada/tower-b-domestic', { state: routeState });
        else if (isTowerACDomestic) navigate('/scada/tower-ac-domestic', { state: routeState });
        else if (isTowerBFlushing) navigate('/scada/tower-b-flushing', { state: routeState });
        else if (isTowerACFlushing) navigate('/scada/tower-ac-flushing', { state: routeState });
        else if (isGardenSystem) navigate('/scada/gardan-system', { state: routeState });
        else if (isSubSoilPump01) navigate('/scada/sub-soil-pump-01', { state: routeState });
        else if (isSubSoilPump02) navigate('/scada/sub-soil-pump-02', { state: routeState });
        else if (isSubSoilPump03) navigate('/scada/sub-soil-pump-03', { state: routeState });
        else if (isSubSoilPump04) navigate('/scada/sub-soil-pump-04', { state: routeState });
        else if (isSumpPump01) navigate('/scada/sump-pump-01', { state: routeState });
        else if (isSumpPump02) navigate('/scada/sump-pump-02', { state: routeState });
        else if (isSumpPump03) navigate('/scada/sump-pump-03', { state: routeState });
        else if (isSumpPump04) navigate('/scada/sump-pump-04', { state: routeState });
        else if (isSumpPump05) navigate('/scada/sump-pump-05', { state: routeState });
        else if (isSumpPump06) navigate('/scada/sump-pump-06', { state: routeState });
      }}
    >
      {/* Separated Header Section */}
      <div className="px-6 py-3 md:px-8 md:py-3.5 border-b border-gray-100">
        <DeviceHeader name={name} status={status} faults={latestData.faults} />
      </div>

      {/* Body Content Section */}
      <div className="p-6 md:p-8">
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
              icon={<span className="text-amber-500"><VoltageIcon /></span>}
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
      </div>

      {/* Separated Footer Section */}
      <div className="px-6 py-4 md:px-8 border-t border-gray-100">
        <DeviceFooter timestamp={latestData.timestamp} />
      </div>
    </div>
  );
};
