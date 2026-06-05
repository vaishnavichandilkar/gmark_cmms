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

export const BoosterDashboard: React.FC<BoosterDashboardProps> = ({ 
  title, 
  panelId, 
  buildingName, 
  pump1Id = '20260508012', 
  pump2Id = '20260508045' 
}) => {
  const [tankLevel] = useState(78);

  // Initial mockup state for Pump 1 and Pump 2
  const [pump1, setPump1] = useState<any>({
    id: pump1Id,
    name: 'Pump 1',
    status: 'OFF',
    currentR: 0, currentY: 0, currentB: 0,
    mode: 'AUTO',
    runOnTime: '0:0 Hrs',
    faults: 0
  });

  const [pump2, setPump2] = useState<any>({
    id: pump2Id,
    name: 'Pump 2',
    status: 'OFF',
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
        setPump1((prev: any) => ({
          ...prev,
          status: d1.status.toUpperCase(),
          currentR: d1.latestData?.current || 0,
          currentY: d1.latestData?.current || 0,
          currentB: d1.latestData?.current || 0,
          mode: d1.latestData?.panelWorkMode || 'AUTO',
          faults: d1.latestData?.faults || 0,
        }));
      }
      if (d2 && !d2.error) {
        setPump2((prev: any) => ({
          ...prev,
          status: d2.status.toUpperCase(),
          currentR: d2.latestData?.current || 0,
          currentY: d2.latestData?.current || 0,
          currentB: d2.latestData?.current || 0,
          mode: d2.latestData?.panelWorkMode || 'AUTO',
          faults: d2.latestData?.faults || 0,
        }));
      }
    });

    const socket = io('http://localhost:3000');
    socket.on('device-update', (update: any) => {
      if (update.deviceId === pump1Id) {
        setPump1((prev: any) => ({
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
        setPump2((prev: any) => ({
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
  }, []);

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
        <div className="col-span-1 lg:col-span-3 flex flex-col">
          <PerformanceCard />
          <PressureCard />
          <DelaySettingsCard />
          <FaultResetCard hasFault={totalFaults > 0} />
        </div>

        {/* CENTER PROCESS FLOW */}
        <div className="col-span-1 lg:col-span-9 flex flex-col">
          <ProcessFlowContainer>
            {/* Draw Pipes via absolute overlay */}
            <div className="absolute inset-0 z-0">
              {/* Main Inlet Pipe from Tank */}
              <Pipe x1={150} y1={400} x2={150} y2={450} flowDirection={hasFlow ? 'forward' : 'none'} />
              <Pipe x1={150} y1={450} x2={250} y2={450} flowDirection={hasFlow ? 'forward' : 'none'} />
              <Pipe x1={250} y1={450} x2={250} y2={250} flowDirection={hasFlow ? 'forward' : 'none'} />
              
              {/* Branch to Pump 1 */}
              <Pipe x1={250} y1={250} x2={350} y2={250} flowDirection={pump1Running ? 'forward' : 'none'} />
              
              {/* Branch to Pump 2 */}
              <Pipe x1={250} y1={400} x2={350} y2={400} flowDirection={pump2Running ? 'forward' : 'none'} />

              {/* Pump 1 Discharge */}
              <Pipe x1={700} y1={250} x2={780} y2={250} flowDirection={pump1Running ? 'forward' : 'none'} />
              
              {/* Pump 2 Discharge */}
              <Pipe x1={700} y1={400} x2={780} y2={400} flowDirection={pump2Running ? 'forward' : 'none'} />
              
              {/* Outlet Manifold */}
              <Pipe x1={780} y1={250} x2={780} y2={100} flowDirection={hasFlow ? 'forward' : 'none'} />
              <Pipe x1={780} y1={400} x2={780} y2={250} flowDirection={pump2Running ? 'forward' : 'none'} />
              
              {/* Outlet final */}
              <Pipe x1={780} y1={100} x2={850} y2={100} flowDirection={hasFlow ? 'forward' : 'none'} />
              
              {/* Outlet Arrow */}
              <div className="absolute left-[855px] top-[90px] text-[#3b82f6] font-bold tracking-widest uppercase">OUTLET →</div>
            </div>

            {/* Elements */}
            <div className="absolute top-[80px] left-[50px] z-10">
              <Tank level={tankLevel} />
            </div>

            <div className="absolute top-[120px] left-[350px] z-10">
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

            <div className="absolute top-[320px] left-[350px] z-10">
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
          </ProcessFlowContainer>
        </div>
      </div>

      {/* BOTTOM PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <div className="col-span-1 lg:col-span-4 flex flex-col">
          <SystemHealthCard faults={totalFaults} />
          <BottomStatusBar 
            faults={totalFaults} 
            runningPumps={runningPumps} 
            totalPumps={2} 
            waterLevel={tankLevel} 
          />
        </div>
        <div className="col-span-1 lg:col-span-4 flex flex-col">
          <QuickStatusCard />
        </div>
        <div className="col-span-1 lg:col-span-4 flex flex-col">
          <SystemInfoCard systemName={title} location={buildingName} panelId={panelId} />
        </div>
      </div>

    </div>
  );
};
