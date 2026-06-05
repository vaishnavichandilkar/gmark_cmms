import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ScadaHeader } from './components/ScadaHeader';
import { PerformanceCard } from './components/PerformanceCard';
import { PressureCard } from './components/PressureCard';
import { DelaySettingsCard } from './components/DelaySettingsCard';
import { FaultResetCard } from './components/FaultResetCard';
import { SystemHealthCard } from './components/SystemHealthCard';
import { QuickStatusCard } from './components/QuickStatusCard';
import { SystemInfoCard } from './components/SystemInfoCard';
import { BottomStatusBar } from './components/BottomStatusBar';
import { ProcessFlowContainer, Pipe } from './components/ProcessFlow/PipeNetwork';
import { Tank } from './components/ProcessFlow/Tank';
import { PumpUnit } from './components/ProcessFlow/PumpUnit';

export interface BoosterDashboardProps {
  title: string;
  panelId: string;
  buildingName: string;
  pump1Id?: string;
  pump2Id?: string;
}

interface PumpState {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'RUNNING' | 'FAULT' | 'WARNING';
  currentR: number;
  currentY: number;
  currentB: number;
  mode: 'AUTO' | 'MANUAL' | 'OFF';
  runOnTime: string;
  faults: number;
}

interface DeviceUpdate {
  deviceId: string;
  registers: {
    runningState?: 'ONLINE' | 'OFFLINE' | 'RUNNING' | 'FAULT' | 'WARNING';
    current?: number;
    panelWorkMode?: 'AUTO' | 'MANUAL' | 'OFF';
    faults?: number;
  };
}

export const BoosterDashboard: React.FC<BoosterDashboardProps> = ({ 
  title, 
  panelId, 
  buildingName, 
  pump1Id = '20260508012', 
  pump2Id = '20260508045' 
}) => {
  const [tankLevel] = useState(78);

  // Initial mockup state for Pump 1 and Pump 2
  const [pump1, setPump1] = useState<PumpState>({
    id: pump1Id,
    name: 'Pump 1',
    status: 'OFFLINE',
    currentR: 0, currentY: 0, currentB: 0,
    mode: 'AUTO',
    runOnTime: '0:0 Hrs',
    faults: 0
  });

  const [pump2, setPump2] = useState<PumpState>({
    id: pump2Id,
    name: 'Pump 2',
    status: 'OFFLINE',
    currentR: 0, currentY: 0, currentB: 0,
    mode: 'AUTO',
    runOnTime: '0:0 Hrs',
    faults: 0
  });

  // Fetch actual data and listen to web sockets
  useEffect(() => {
    // Attempt to fetch from DB backend
    Promise.all([
      fetch(`http://localhost:3000/devices/${pump1Id}/dashboard`).then(r => r.json()).catch(() => null),
      fetch(`http://localhost:3000/devices/${pump2Id}/dashboard`).then(r => r.json()).catch(() => null),
    ]).then(([d1, d2]) => {
      if (d1 && !d1.error) {
        setPump1((prev: PumpState) => ({
          ...prev,
          status: (d1.status?.toUpperCase() || 'OFFLINE') as PumpState['status'],
          currentR: d1.latestData?.current || 0,
          currentY: d1.latestData?.current || 0,
          currentB: d1.latestData?.current || 0,
          mode: (d1.latestData?.panelWorkMode || 'AUTO') as PumpState['mode'],
          faults: d1.latestData?.faults || 0,
        }));
      }
      if (d2 && !d2.error) {
        setPump2((prev: PumpState) => ({
          ...prev,
          status: (d2.status?.toUpperCase() || 'OFFLINE') as PumpState['status'],
          currentR: d2.latestData?.current || 0,
          currentY: d2.latestData?.current || 0,
          currentB: d2.latestData?.current || 0,
          mode: (d2.latestData?.panelWorkMode || 'AUTO') as PumpState['mode'],
          faults: d2.latestData?.faults || 0,
        }));
      }
    });

    const socket = io('http://localhost:3000');
    socket.on('device-update', (update: DeviceUpdate) => {
      if (update.deviceId === pump1Id) {
        setPump1((prev: PumpState) => ({
          ...prev,
          status: update.registers.runningState || 'ONLINE',
          currentR: update.registers.current || prev.currentR,
          currentY: update.registers.current || prev.currentY,
          currentB: update.registers.current || prev.currentB,
          mode: update.registers.panelWorkMode || prev.mode,
          faults: update.registers.faults || prev.faults
        }));
      }
      if (update.deviceId === pump2Id) {
        setPump2((prev: PumpState) => ({
          ...prev,
          status: update.registers.runningState || 'ONLINE',
          currentR: update.registers.current || prev.currentR,
          currentY: update.registers.current || prev.currentY,
          currentB: update.registers.current || prev.currentB,
          mode: update.registers.panelWorkMode || prev.mode,
          faults: update.registers.faults || prev.faults
        }));
      }
    });

    return () => { socket.disconnect(); };
  }, [pump1Id, pump2Id]);

  const totalFaults = pump1.faults + pump2.faults;
  const runningPumps = (pump1.status === 'RUNNING' || pump1.status === 'ONLINE' ? 1 : 0) + (pump2.status === 'RUNNING' || pump2.status === 'ONLINE' ? 1 : 0);
  
  // Pipeline Flow Logic
  const pump1Running = pump1.status === 'RUNNING' || pump1.status === 'ONLINE';
  const pump2Running = pump2.status === 'RUNNING' || pump2.status === 'ONLINE';
  const hasFlow = pump1Running || pump2Running;

  return (
    <div className="min-h-screen bg-[#021B3A] p-4 md:p-6 lg:p-8 overflow-hidden font-sans">
      <ScadaHeader title={title} />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL */}
        <div className="col-span-1 lg:col-span-6 flex flex-col">
          <PerformanceCard />
          <PressureCard />
          <DelaySettingsCard />
          <FaultResetCard hasFault={totalFaults > 0} />
        </div>

        {/* CENTER PROCESS FLOW */}
        <div className="col-span-1 lg:col-span-6 flex flex-col w-full overflow-hidden">
          <div className="w-full overflow-x-auto pb-2 custom-scrollbar relative rounded-[20px]">
            <div className="min-w-[750px]">
              <ProcessFlowContainer>
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[750px] h-full">
                  {/* Draw Pipes via absolute overlay */}
                  <div className="absolute inset-0 z-0">
                    {/* Main Inlet Pipe from Tank */}
                    <div className="absolute left-[180px] top-[506px] text-[10px] text-gray-400 font-bold whitespace-nowrap leading-tight text-left z-0">FROM<br/>TANK</div>
                    <Pipe x1={140} y1={470} x2={140} y2={540} flowDirection={hasFlow ? 'forward' : 'none'} />
                    <Pipe x1={140} y1={540} x2={250} y2={540} flowDirection={hasFlow ? 'forward' : 'none'} />
                    <Pipe x1={250} y1={114} x2={250} y2={540} flowDirection={hasFlow ? 'forward' : 'none'} />
                    
                    {/* Branch to Pump 1 */}
                    <Pipe x1={250} y1={114} x2={300} y2={114} flowDirection={pump1Running ? 'forward' : 'none'} />
                    
                    {/* Branch to Pump 2 */}
                    <Pipe x1={250} y1={454} x2={300} y2={454} flowDirection={pump2Running ? 'forward' : 'none'} />

                    {/* Pump 1 Discharge */}
                    <Pipe x1={520} y1={114} x2={570} y2={114} flowDirection={pump1Running ? 'forward' : 'none'} />
                    
                    {/* Pump 2 Discharge */}
                    <Pipe x1={520} y1={454} x2={570} y2={454} flowDirection={pump2Running ? 'forward' : 'none'} />
                    
                    {/* Outlet Manifold */}
                    <Pipe x1={570} y1={114} x2={570} y2={454} flowDirection={hasFlow ? 'forward' : 'none'} />
                    
                    {/* Outlet final */}
                    <Pipe x1={570} y1={114} x2={620} y2={114} flowDirection={hasFlow ? 'forward' : 'none'} />
                  </div>

                  {/* Elements */}
                  <div className="absolute top-[214px] left-[76px] z-10">
                    <Tank level={tankLevel} />
                  </div>

                  <div className="absolute top-[114px] left-[630px] z-10 -translate-y-1/2 flex items-center">
                    <h3 className="text-white text-xs font-bold tracking-widest uppercase whitespace-nowrap">OUTLET</h3>
                  </div>

                  <div className="absolute top-[48px] left-[300px] z-10">
                    <PumpUnit 
                      name={pump1.name}
                      status={pump1.status}
                      currentR={pump1.currentR}
                      currentY={pump1.currentY}
                      currentB={pump1.currentB}
                      mode={pump1.mode}
                      runOnTime={pump1.runOnTime}
                    />
                  </div>

                  <div className="absolute top-[388px] left-[300px] z-10">
                    <PumpUnit 
                      name={pump2.name}
                      status={pump2.status}
                      currentR={pump2.currentR}
                      currentY={pump2.currentY}
                      currentB={pump2.currentB}
                      mode={pump2.mode}
                      runOnTime={pump2.runOnTime}
                    />
                  </div>
                </div>
              </ProcessFlowContainer>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6 mt-4 md:mt-6">
        <div className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-4 md:gap-6">
          <SystemHealthCard faults={totalFaults} />
          <BottomStatusBar 
            faults={totalFaults} 
            runningPumps={runningPumps} 
            totalPumps={2} 
            waterLevel={tankLevel} 
          />
        </div>
        <div className="col-span-1 md:col-span-1 lg:col-span-4 flex flex-col">
          <QuickStatusCard />
        </div>
        <div className="col-span-1 md:col-span-1 lg:col-span-4 flex flex-col">
          <SystemInfoCard systemName={title} location={buildingName} panelId={panelId} />
        </div>
      </div>

    </div>
  );
};
