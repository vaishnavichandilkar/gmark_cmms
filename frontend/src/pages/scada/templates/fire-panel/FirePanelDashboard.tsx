import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { ShieldAlert, Droplets, CloudRain, CheckCircle2, Maximize, Minimize } from 'lucide-react';
import { api } from '../../../../lib/api';
import type { RootState } from '../../../../store';
import { SectionHeader } from './components/SectionHeader';
import { FirePumpCard } from './components/FirePumpCard';
import { PressureZoneCard } from './components/PressureZoneCard';
import { DieselEngineCard } from './components/DieselEngineCard';
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
  mode: 'AUTO' | 'MANUAL';
  toggleState: boolean;
}

export const FirePanelDashboard: React.FC<FirePanelDashboardProps> = ({
  title,
  panelId,
  buildingName
}) => {
  const [hydrantFaults, setHydrantFaults] = useState(0);
  const [sprinklerFaults, setSprinklerFaults] = useState(0);
  const [boosterFaults, setBoosterFaults] = useState(0);
  const [dieselFaults, setDieselFaults] = useState(0);

  // Mocked states for pumps to match UI exactly
  const [pumps, setPumps] = useState<Record<string, PumpState>>({
    jockeyHydrant: { id: '1', title: 'JOCKEY HYDRANT PUMP', status: 'OFF', mode: 'AUTO', toggleState: true },
    mainHydrant: { id: '2', title: 'MAIN HYDRANT PUMP', status: 'OFF', mode: 'AUTO', toggleState: true },
    jockeySprinkler: { id: '3', title: 'JOCKEY SPRINKLER PUMP', status: 'OFF', mode: 'AUTO', toggleState: true },
    mainSprinkler: { id: '4', title: 'MAIN SPRINKLER PUMP', status: 'OFF', mode: 'AUTO', toggleState: true },
    terraceBooster48: { id: '5', title: 'TERRACE BOOSTER-1', status: 'OFF', mode: 'AUTO', toggleState: true },
    terraceBooster49: { id: '6', title: 'TERRACE BOOSTER-2', status: 'OFF', mode: 'AUTO', toggleState: true },
    jockeyPumpSet: { id: '7', title: 'JOCKEY PUMP SET', status: 'OFF', mode: 'AUTO', toggleState: true },
  });

  const handleToggle = (pumpKey: string) => {
    setPumps(prev => ({
      ...prev,
      [pumpKey]: { ...prev[pumpKey], toggleState: !prev[pumpKey].toggleState }
    }));
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
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 w-full">
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-1 md:col-span-1">
                  <FirePumpCard 
                    {...pumps.jockeyHydrant} 
                    imageType="vertical"
                    onToggle={() => handleToggle('jockeyHydrant')}
                  />
                </div>
                <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
                  <PressureZoneCard title="UPPER ZONE" pressure={18.1} status="NORMAL" />
                  <PressureZoneCard title="LOWER ZONE" pressure={10.8} status="NORMAL" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <FirePumpCard 
                    {...pumps.mainHydrant} 
                    imageType="horizontal"
                    onToggle={() => handleToggle('mainHydrant')}
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-1 md:col-span-1">
                  <FirePumpCard 
                    {...pumps.jockeySprinkler} 
                    imageType="vertical"
                    onToggle={() => handleToggle('jockeySprinkler')}
                  />
                </div>
                <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
                  <PressureZoneCard title="UPPER ZONE" pressure={18.3} status="NORMAL" />
                  <PressureZoneCard title="LOWER ZONE" pressure={10.9} status="NORMAL" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <FirePumpCard 
                    {...pumps.mainSprinkler} 
                    imageType="horizontal"
                    onToggle={() => handleToggle('mainSprinkler')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOOSTER & DIESEL SYSTEM SECTION */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
            {/* Divider Line */}
            <div className="hidden lg:block absolute left-[41.666%] top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2"></div>
            
            {/* Left Side: Booster */}
            <div className="col-span-1 lg:col-span-5 flex flex-col gap-2 pr-0 lg:pr-4">
              <SectionHeader 
                title="TERRACE BOOSTER PUMPS" 
                faultsCount={boosterFaults} 
                icon={<ShieldAlert size={28} className="text-[#00a651]" />} 
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <FirePumpCard 
                    {...pumps.terraceBooster48} 
                    imageType="horizontal"
                    onToggle={() => handleToggle('terraceBooster48')}
                  />
                </div>
                <div className="col-span-1">
                  <FirePumpCard 
                    {...pumps.terraceBooster49} 
                    imageType="horizontal"
                    onToggle={() => handleToggle('terraceBooster49')}
                  />
                </div>
              </div>
            </div>

            {/* Right Side: Diesel */}
            <div className="col-span-1 lg:col-span-7 flex flex-col gap-2 pl-0 lg:pl-4">
              <SectionHeader 
                title="DIESEL ENGINE PUMP" 
                faultsCount={dieselFaults} 
                icon={<ShieldAlert size={28} className="text-[#00a651]" />} 
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <DieselEngineCard />
                </div>
                <div className="col-span-1">
                  <FirePumpCard 
                    {...pumps.jockeyPumpSet} 
                    title="CONTROL PANEL"
                    imageType="horizontal"
                    hideImage={true}
                    onToggle={() => handleToggle('jockeyPumpSet')}
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
