import React, { useState, useEffect, useRef } from 'react';

import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { Droplets, CloudRain, Maximize, Minimize, Gauge, Fuel } from 'lucide-react';
import { api } from '../../../../lib/api';
import type { RootState } from '../../../../store';
import { SectionHeader } from './components/SectionHeader';
import { FirePumpCard } from './components/FirePumpCard';
import { PressureZoneCard } from './components/PressureZoneCard';
import { DieselEngineCard } from './components/DieselEngineCard';
import { PasswordModal } from '../../../../components/shared/PasswordModal';
import './scada.css';

export interface FirePanelDashboardProps {
  title: string;
  panelId: string;
  buildingName: string;
}

interface PumpState {
  id: string;
  title: string;
  status: 'ON' | 'OFF' | 'TRIP';
  mode: 'AUTO' | 'OFF' | 'MANUAL';
  toggleState: boolean;
}

export const FirePanelDashboard: React.FC<FirePanelDashboardProps> = ({
  title,
  panelId,
  buildingName
}) => {
  const [hydrantFaults] = useState(0);
  const [sprinklerFaults] = useState(0);
  const [boosterFaults] = useState(0);
  const [dieselFaults] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<{pumpKey: string, nextState: boolean} | null>(null);

  const { accessToken } = useSelector((state: RootState) => state.auth);
  const deviceTopic = panelId;

  // Mocked states for pumps to match UI exactly
  const [pumps, setPumps] = useState<Record<string, PumpState>>({
    jockeyHydrant: { id: '1', title: 'JOCKEY HYDRANT PUMP', status: 'OFF', mode: 'AUTO', toggleState: false },
    mainHydrant: { id: '2', title: 'MAIN HYDRANT PUMP', status: 'OFF', mode: 'AUTO', toggleState: false },
    jockeySprinkler: { id: '3', title: 'JOCKEY SPRINKLER PUMP', status: 'OFF', mode: 'AUTO', toggleState: false },
    mainSprinkler: { id: '4', title: 'MAIN SPRINKLER PUMP', status: 'OFF', mode: 'AUTO', toggleState: false },
    terraceBooster48: { id: '5', title: 'TERRACE BOOSTER-1', status: 'OFF', mode: 'AUTO', toggleState: false },
    terraceBooster49: { id: '6', title: 'TERRACE BOOSTER-2', status: 'OFF', mode: 'AUTO', toggleState: false },
    jockeyPumpSet: { id: '7', title: 'JOCKEY PUMP SET', status: 'OFF', mode: 'AUTO', toggleState: false },
  });

  const [pressures, setPressures] = useState({
    upper1: 0,
    lower1: 0,
    upper2: 0,
    lower2: 0
  });

  const processPayload = (data: any, _isInitial: boolean) => {
    setPumps(prev => {
      const p = { 
        jockeyHydrant: { ...prev.jockeyHydrant },
        mainHydrant: { ...prev.mainHydrant },
        jockeySprinkler: { ...prev.jockeySprinkler },
        mainSprinkler: { ...prev.mainSprinkler },
        terraceBooster48: { ...prev.terraceBooster48 },
        terraceBooster49: { ...prev.terraceBooster49 },
        jockeyPumpSet: { ...prev.jockeyPumpSet },
      };

      const mapPump = (key: keyof typeof p, dbPrefix: string) => {
        // Status mapping
        if (data[`${dbPrefix}Trip`] !== undefined && Number(data[`${dbPrefix}Trip`]) > 0) {
          p[key].status = 'TRIP';
        } else if (data[`${dbPrefix}On`] !== undefined && Number(data[`${dbPrefix}On`]) > 0) {
          p[key].status = 'ON';
        } else if (data[`${dbPrefix}Off`] !== undefined && Number(data[`${dbPrefix}Off`]) > 0) {
          p[key].status = 'OFF';
        } else if (data[`${dbPrefix}On`] !== undefined) {
          p[key].status = Number(data[`${dbPrefix}On`]) > 0 ? 'ON' : 'OFF';
        } else if (data[`${dbPrefix}ControlOn`] !== undefined) {
          // Fallback to Control registers if Status registers are missing (e.g., line2Jockey)
          p[key].status = Number(data[`${dbPrefix}ControlOn`]) > 0 ? 'ON' : 'OFF';
        }

        // Mode mapping
        if (data[`${dbPrefix}Auto`] !== undefined || data[`${dbPrefix}Manual`] !== undefined) {
          const isAuto = Number(data[`${dbPrefix}Auto`]) > 0;
          const isManual = Number(data[`${dbPrefix}Manual`]) > 0;
          if (isAuto) p[key].mode = 'AUTO';
          else if (isManual) p[key].mode = 'MANUAL';
          else p[key].mode = 'OFF';
        }
        
        // Command / Toggle State mapping
        // If we don't have a specific control register, we bind it to the ON status for now
        if (data[`${dbPrefix}ControlOn`] !== undefined) {
          p[key].toggleState = Number(data[`${dbPrefix}ControlOn`]) > 0;
        } else if (p[key].status === 'ON') {
          p[key].toggleState = true;
        } else if (p[key].status === 'OFF') {
          p[key].toggleState = false;
        }
      };

      mapPump('jockeyHydrant', 'line1Jockey');
      mapPump('mainHydrant', 'line1Main');
      // Line-2 Jockey lacks Status registers on this demo kit, so we rely on the ControlOn fallback added above
      mapPump('jockeySprinkler', 'line2Jockey');
      mapPump('mainSprinkler', 'line2Main');
      mapPump('terraceBooster48', 'terraceBooster1');
      mapPump('terraceBooster49', 'terraceBooster2');
      
      // Diesel pump
      if (data.dgAuto !== undefined || data.dgManual !== undefined) {
        const isAuto = Number(data.dgAuto) > 0;
        const isManual = Number(data.dgManual) > 0;
        p.jockeyPumpSet.mode = isAuto ? 'AUTO' : isManual ? 'MANUAL' : 'OFF';
      }
      
      if (data.dgOn !== undefined) {
        p.jockeyPumpSet.status = Number(data.dgOn) > 0 ? 'ON' : 'OFF';
        p.jockeyPumpSet.toggleState = Number(data.dgOn) > 0;
      } else if (data.dgControlOn !== undefined) {
        const isOn = Number(data.dgControlOn) > 0;
        p.jockeyPumpSet.status = isOn ? 'ON' : 'OFF';
        p.jockeyPumpSet.toggleState = isOn;
      }

      return p;
    });

    setPressures(prev => ({
      ...prev,
      upper1: data.uzLine1Pressure !== undefined ? Number(data.uzLine1Pressure) / 100.0 : prev.upper1,
      upper2: data.uzLine2Pressure !== undefined ? Number(data.uzLine2Pressure) / 100.0 : prev.upper2,
    }));
  };

  useEffect(() => {
    if (!panelId) return;

    api.get(`/devices/${panelId}/dashboard`)
      .then(r => {
        const res = r.data;
        if (res && !res.error) {
          processPayload(res, true);
        }
      })
      .catch(console.error);

    const socket = io('http://localhost:3001', {
      auth: { token: accessToken },
    });

    socket.on('connect', () => {
      socket.emit('join-device', { topic: deviceTopic });
    });

    socket.on('device-update', (update: { deviceId: string, registers: any }) => {
      if (update.deviceId === panelId && update.registers) {
        processPayload(update.registers, false);
      }
    });

    return () => {
      socket.emit('leave-device', { topic: deviceTopic });
      socket.disconnect();
    };
  }, [panelId, deviceTopic, accessToken]);

  const handleStatusChange = (pumpKey: string, newStatus: 'ON' | 'OFF' | 'TRIP') => {
    setPumps(prev => ({
      ...prev,
      [pumpKey]: { ...prev[pumpKey], status: newStatus }
    }));
  };

  const handleModeChange = (pumpKey: string, newMode: 'AUTO' | 'OFF' | 'MANUAL') => {
    setPumps(prev => ({
      ...prev,
      [pumpKey]: { ...prev[pumpKey], mode: newMode }
    }));
  };

  const handleToggleClick = (pumpKey: string) => {
    // Open password modal before proceeding
    const isCurrentlyOn = pumps[pumpKey].toggleState;
    setPendingCommand({ pumpKey, nextState: !isCurrentlyOn });
    setIsModalOpen(true);
  };

  const executeCommand = async (password: string) => {
    if (!pendingCommand) return;
    
    const { pumpKey, nextState } = pendingCommand;
    
    // Map pump keys to their control register names (based on processPayload mapping)
    const controlMapping: Record<string, string> = {
      jockeyHydrant: 'line1JockeyControlOn',
      mainHydrant: 'line1MainControlOn',
      jockeySprinkler: 'line2JockeyControlOn',
      mainSprinkler: 'line2MainControlOn',
      jockeyPumpSet: 'dgControlOn',
    };
    
    // Default to the ON registers. Value 1 = ON, Value 0 = OFF.
    // If it's a booster, we'll map differently if needed, but the demo kit is a fire panel.
    const mappedKey = controlMapping[pumpKey];
    
    // Find the register address from the key
    // For a robust implementation, we would query the backend for the register map, 
    // but for the demo we can use the known addresses.
    const registerAddresses: Record<string, number> = {
      line1MainControlOn: 141,
      line2MainControlOn: 142,
      line2JockeyControlOn: 143,
      line1JockeyControlOn: 144,
      dgControlOn: 145,
    };
    
    const address = registerAddresses[mappedKey];
    
    // Some pumps have a separate OFF register (+4 offset in this demo kit pattern)
    // 142(L2MainOn)->146(L2MainOff), 143(L2JockeyOn)->147(L2JockeyOff), 144(L1JockeyOn)->148(L1JockeyOff)
    let targetAddress = address;
    let targetValue = nextState ? 1 : 0;
    
    if (address !== undefined) {
      // Pulse logic for OFF if it's one of the known momentary registers
      if (!nextState && address >= 142 && address <= 144) {
        targetAddress = address + 4; // Use the OFF register
        targetValue = 1; // Send 1 to the OFF register to trigger the stop pulse
      } else if (!nextState && address === 141) {
        // We don't have a known separate OFF register for L1Main (141) in the seed.ts.
        // Try sending 0 to 141 for now, or if 140 is the OFF register, we would use that.
        targetValue = 0; 
      }

      try {
        const payload = {
          command: {
            topic: `SE-${panelId}/MODBUS/REQ/96/9600/8/0/1`,
            register: targetAddress.toString(),
            slaveAddress: "1",
            value: targetValue.toString()
          },
          password
        };
        
        await api.post(`/devices/${panelId}/command`, payload);
        
        // Optimistically update the UI
        setPumps(prev => ({
          ...prev,
          [pumpKey]: { ...prev[pumpKey], toggleState: nextState, status: nextState ? 'ON' : 'OFF' }
        }));
        
        setIsModalOpen(false);
        setPendingCommand(null);
      } catch (error: any) {
        console.error('Failed to send command:', error);
        alert(error.response?.data?.message || 'Invalid password or failed to execute command.');
      }
    } else {
       // If no mapping found (like terrace boosters on the fire panel), just close modal
       alert('Control not supported for this pump in the demo.');
       setIsModalOpen(false);
    }
  };

  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      dashboardRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div ref={dashboardRef} className={`py-4 px-2 lg:py-6 lg:px-4 bg-white ${isFullscreen ? 'h-screen overflow-y-auto' : 'min-h-screen'}`}>
      <PasswordModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setPendingCommand(null);
        }}
        onSubmit={executeCommand}
      />
      {/* Top Asset Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
          <p className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2 mt-1">
            <span>{buildingName}</span>
            {panelId && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span className="text-gray-400">MAC: {panelId}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center text-gray-600 shadow-sm"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* HYDRANT & SPRINKLER SYSTEM SECTION */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
            {/* Divider Line */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2"></div>
            
            {/* Left Side: Hydrant */}
            <div className="flex flex-col gap-2">
              <SectionHeader 
                title="HYDRANT SYSTEM" 
                faultsCount={hydrantFaults} 
                icon={<Droplets size={28} className="text-[#00a651]" />} 
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
                <div className="col-span-1">
                  <FirePumpCard 
                    {...pumps.jockeyHydrant} 
                    imageType="vertical"
                    onToggle={() => handleToggleClick('jockeyHydrant')}
                    onModeChange={(mode) => handleModeChange('jockeyHydrant', mode)}
                    onStatusChange={(status) => handleStatusChange('jockeyHydrant', status)}
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-4">
                  <PressureZoneCard title="UPPER ZONE" pressure={pressures.upper1} status={pressures.upper1 > 22 ? 'FAULT' : 'NORMAL'} />
                  <PressureZoneCard title="LOWER ZONE" pressure={pressures.lower1} status={pressures.lower1 > 22 ? 'FAULT' : 'NORMAL'} />
                </div>
                <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                  <FirePumpCard 
                    {...pumps.mainHydrant} 
                    imageType="horizontal"
                    onToggle={() => handleToggleClick('mainHydrant')}
                    onModeChange={(mode) => handleModeChange('mainHydrant', mode)}
                    onStatusChange={(status) => handleStatusChange('mainHydrant', status)}
                  />
                </div>
              </div>
            </div>

            {/* Right Side: Sprinkler */}
            <div className="flex flex-col gap-2">
              <SectionHeader 
                title="SPRINKLER SYSTEM" 
                faultsCount={sprinklerFaults} 
                icon={<CloudRain size={28} className="text-[#00a651]" />} 
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
                <div className="col-span-1">
                  <FirePumpCard 
                    {...pumps.jockeySprinkler} 
                    imageType="vertical"
                    onToggle={() => handleToggleClick('jockeySprinkler')}
                    onModeChange={(mode) => handleModeChange('jockeySprinkler', mode)}
                    onStatusChange={(status) => handleStatusChange('jockeySprinkler', status)}
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-4">
                  <PressureZoneCard title="UPPER ZONE" pressure={pressures.upper2} status={pressures.upper2 > 22 ? 'FAULT' : 'NORMAL'} />
                  <PressureZoneCard title="LOWER ZONE" pressure={pressures.lower2} status={pressures.lower2 > 22 ? 'FAULT' : 'NORMAL'} />
                </div>
                <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                  <FirePumpCard 
                    {...pumps.mainSprinkler} 
                    imageType="horizontal"
                    onToggle={() => handleToggleClick('mainSprinkler')}
                    onModeChange={(mode) => handleModeChange('mainSprinkler', mode)}
                    onStatusChange={(status) => handleStatusChange('mainSprinkler', status)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOOSTER & DIESEL SYSTEM SECTION */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
            {/* Divider Line */}
            <div className="hidden lg:block absolute left-[41.666%] top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2"></div>
            
            {/* Left Side: Booster */}
            <div className="col-span-1 lg:col-span-5 flex flex-col gap-2 pr-0 lg:pr-4">
              <SectionHeader 
                title="TERRACE BOOSTER PUMPS" 
                faultsCount={boosterFaults} 
                icon={<Gauge size={28} className="text-[#00a651]" />} 
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <FirePumpCard 
                    {...pumps.terraceBooster48} 
                    imageType="horizontal"
                    onToggle={() => handleToggleClick('terraceBooster48')}
                    onModeChange={(mode) => handleModeChange('terraceBooster48', mode)}
                    onStatusChange={(status) => handleStatusChange('terraceBooster48', status)}
                  />
                </div>
                <div className="col-span-1">
                  <FirePumpCard 
                    {...pumps.terraceBooster49} 
                    imageType="horizontal"
                    onToggle={() => handleToggleClick('terraceBooster49')}
                    onModeChange={(mode) => handleModeChange('terraceBooster49', mode)}
                    onStatusChange={(status) => handleStatusChange('terraceBooster49', status)}
                  />
                </div>
              </div>
            </div>

            {/* Right Side: Diesel */}
            <div className="col-span-1 lg:col-span-7 flex flex-col gap-2 pl-0 lg:pl-4">
              <SectionHeader 
                title="DIESEL ENGINE PUMP" 
                faultsCount={dieselFaults} 
                icon={<Fuel size={28} className="text-[#00a651]" />} 
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <DieselEngineCard status={pumps.jockeyPumpSet.status} />
                </div>
                <div className="col-span-1">
                  <FirePumpCard 
                    {...pumps.jockeyPumpSet} 
                    title="CONTROL PANEL"
                    imageType="horizontal"
                    hideImage={true}
                    onToggle={() => handleToggleClick('jockeyPumpSet')}
                    onModeChange={(mode) => handleModeChange('jockeyPumpSet', mode)}
                    onStatusChange={(status) => handleStatusChange('jockeyPumpSet', status)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
