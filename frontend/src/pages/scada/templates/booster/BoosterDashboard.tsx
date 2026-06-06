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
  registers: any; // Now we get the full parsed DeviceState via websocket
}

interface DashboardState {
  averageVoltage: number;
  ryVoltage: number;
  ybVoltage: number;
  rbVoltage: number;
  pressureBar: number;
  transmitterConnected: boolean;
  waterAvailable: boolean;
  deviceActive: boolean;
  inputPowerFaultType: number;
}

export const BoosterDashboard: React.FC<BoosterDashboardProps> = ({
  title,
  panelId,
  buildingName,
  pump1Id = '20260508012',
  pump2Id = '20260508045'
}) => {

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

  const [dashboardData, setDashboardData] = useState<DashboardState>({
    averageVoltage: 0, ryVoltage: 0, ybVoltage: 0, rbVoltage: 0,
    pressureBar: 0, transmitterConnected: false, waterAvailable: false,
    deviceActive: false, inputPowerFaultType: 0
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
        const data = d1.latestData || {};

        setPump1((prev: PumpState) => ({
          ...prev,
          status: data.motor1Status ? 'RUNNING' : d1.status === 'online' ? 'ONLINE' : 'OFFLINE',
          currentR: data.motor1RCurrent || 0,
          currentY: data.motor1YCurrent || 0,
          currentB: data.motor1BCurrent || 0,
          mode: 'AUTO', // Assuming AUTO by default as it's not in the map
          faults: data.pump1FaultType || 0,
          runOnTime: `${data.motor1RunTime || 0} Hrs`
        }));

        setDashboardData({
          averageVoltage: data.averageVoltage || 0,
          ryVoltage: data.ryVoltage || 0,
          ybVoltage: data.ybVoltage || 0,
          rbVoltage: data.rbVoltage || 0,
          pressureBar: data.pressureBar || 0,
          transmitterConnected: data.transmitterConnected || false,
          waterAvailable: data.waterAvailable || false,
          deviceActive: data.deviceActive || false,
          inputPowerFaultType: data.inputPowerFaultType || 0
        });
      }
      if (d2 && !d2.error) {
        const data = d2.latestData || {};
        setPump2((prev: PumpState) => ({
          ...prev,
          status: data.motor2Status ? 'RUNNING' : d2.status === 'online' ? 'ONLINE' : 'OFFLINE',
          currentR: data.motor2RCurrent || 0,
          currentY: data.motor2YCurrent || 0,
          currentB: data.motor2BCurrent || 0,
          mode: 'AUTO',
          faults: data.pump2FaultType || 0,
          runOnTime: `${data.motor2RunTime || 0} Hrs`
        }));
      }
    });

    const socket = io('http://localhost:3000');
    socket.on('device-update', (update: DeviceUpdate) => {
      const data = update.registers || {};

      if (update.deviceId === pump1Id) {
        setPump1((prev: PumpState) => ({
          ...prev,
          status: data.motor1Status ? 'RUNNING' : 'ONLINE', // if update received, device is online
          currentR: data.motor1RCurrent ?? prev.currentR,
          currentY: data.motor1YCurrent ?? prev.currentY,
          currentB: data.motor1BCurrent ?? prev.currentB,
          faults: data.pump1FaultType ?? prev.faults,
          runOnTime: data.motor1RunTime ? `${data.motor1RunTime} Hrs` : prev.runOnTime
        }));

        setDashboardData(prev => ({
          ...prev,
          averageVoltage: data.averageVoltage ?? prev.averageVoltage,
          ryVoltage: data.ryVoltage ?? prev.ryVoltage,
          ybVoltage: data.ybVoltage ?? prev.ybVoltage,
          rbVoltage: data.rbVoltage ?? prev.rbVoltage,
          pressureBar: data.pressureBar ?? prev.pressureBar,
          transmitterConnected: data.transmitterConnected ?? prev.transmitterConnected,
          waterAvailable: data.waterAvailable ?? prev.waterAvailable,
          deviceActive: data.deviceActive ?? prev.deviceActive,
          inputPowerFaultType: data.inputPowerFaultType ?? prev.inputPowerFaultType
        }));
      }
      if (update.deviceId === pump2Id) {
        setPump2((prev: PumpState) => ({
          ...prev,
          status: data.motor2Status ? 'RUNNING' : 'ONLINE',
          currentR: data.motor2RCurrent ?? prev.currentR,
          currentY: data.motor2YCurrent ?? prev.currentY,
          currentB: data.motor2BCurrent ?? prev.currentB,
          faults: data.pump2FaultType ?? prev.faults,
          runOnTime: data.motor2RunTime ? `${data.motor2RunTime} Hrs` : prev.runOnTime
        }));
      }
    });

    return () => { socket.disconnect(); };
  }, [pump1Id, pump2Id]);

  // FORCE PUMP 2 OFF FOR DEMO
  const displayPump2 = { ...pump2, status: 'OFFLINE' as PumpState['status'], mode: 'OFF' as PumpState['mode'], currentR: 0, currentY: 0, currentB: 0 };

  const totalFaults = pump1.faults + displayPump2.faults;
  const runningPumps = (pump1.status === 'RUNNING' || pump1.status === 'ONLINE' ? 1 : 0) + (displayPump2.status === 'RUNNING' || displayPump2.status === 'ONLINE' ? 1 : 0);

  // Pipeline Flow Logic
  const pump1Running = pump1.status === 'RUNNING' || pump1.status === 'ONLINE';
  const pump2Running = displayPump2.status === 'RUNNING' || displayPump2.status === 'ONLINE';
  const hasFlow = pump1Running || pump2Running;

  return (
    <div className="min-h-screen bg-[#021B3A] p-4 md:p-6 lg:p-8 overflow-hidden font-sans">
      <ScadaHeader title={title} />

      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT PANEL */}
        <div className="w-full lg:w-2/5 flex-none flex flex-col min-w-[300px]">
          <PerformanceCard
            voltageR={dashboardData.ryVoltage}
            voltageY={dashboardData.ybVoltage}
            voltageB={dashboardData.rbVoltage}
            currentR={pump1.currentR + pump2.currentR}
            currentY={pump1.currentY + pump2.currentY}
            currentB={pump1.currentB + pump2.currentB}
            power={dashboardData.averageVoltage > 0 ? ((pump1.currentR + pump2.currentR) * dashboardData.averageVoltage * 1.732 * 0.8 / 1000) : 0}
          />
          <PressureCard
            pressure={dashboardData.pressureBar}
            isConnected={dashboardData.transmitterConnected}
          />
          <DelaySettingsCard />
          <FaultResetCard hasFault={totalFaults > 0 || dashboardData.inputPowerFaultType > 0} />
        </div>

        {/* CENTER PROCESS FLOW */}
        <div className="w-full lg:w-3/5 flex-grow flex flex-col overflow-hidden">
          <div className="w-full overflow-x-auto pb-2 custom-scrollbar relative rounded-[20px]">
            <div className="min-w-[950px] w-[950px]">
              <ProcessFlowContainer>
                <div className="absolute right-0 top-0 w-[950px] h-full">
                  {/* Draw Pipes via absolute overlay */}
                  <div className="absolute inset-0 z-0">
                    {/* Main Inlet Pipe from Tank */}
                    <div className="absolute left-[80px] top-[495px] text-[10px] text-gray-400 font-bold whitespace-nowrap leading-tight text-left z-0">FROM<br />TANK</div>
                    {/* Vertical down from Tank center (x=144, y=431 to y=565) */}
                    <Pipe x1={144} y1={431} x2={144} y2={565} flowDirection={hasFlow ? 'forward' : 'none'} />
                    {/* Horizontal to Pump 1 branch (x=144 to x=410, y=565) */}
                    <Pipe x1={144} y1={565} x2={410} y2={565} flowDirection={hasFlow ? 'forward' : 'none'} />
                    {/* Horizontal from Pump 1 to Pump 2 branch (x=410 to x=690, y=565) */}
                    <Pipe x1={410} y1={565} x2={690} y2={565} flowDirection={pump2Running ? 'forward' : 'none'} />

                    {/* Vertical Branch UP to Pump 1 inlet (x=410, y=565 to y=465) */}
                    <Pipe x1={410} y1={565} x2={410} y2={465} flowDirection={pump1Running ? 'forward' : 'none'} />
                    {/* Vertical Branch UP to Pump 2 inlet (x=690, y=565 to y=465) */}
                    <Pipe x1={690} y1={565} x2={690} y2={465} flowDirection={pump2Running ? 'forward' : 'none'} />

                    {/* Vertical Branch UP from Pump 1 outlet (x=410, y=175 to y=115) */}
                    <Pipe x1={410} y1={175} x2={410} y2={115} flowDirection={pump1Running ? 'forward' : 'none'} />
                    {/* Vertical Branch UP from Pump 2 outlet (x=690, y=175 to y=115) */}
                    <Pipe x1={690} y1={175} x2={690} y2={115} flowDirection={pump2Running ? 'forward' : 'none'} />

                    {/* Horizontal Outlet line between Pump 1 and Pump 2 (x=410 to x=690, y=115) */}
                    <Pipe x1={410} y1={115} x2={690} y2={115} flowDirection={pump1Running ? 'forward' : 'none'} />
                    {/* Horizontal Outlet line from Pump 2 to Outlet (x=690 to x=840, y=115) */}
                    <Pipe x1={690} y1={115} x2={840} y2={115} flowDirection={hasFlow ? 'forward' : 'none'} />
                  </div>

                  {/* Elements */}
                  <div className="absolute top-[175px] left-[80px] z-10">
                    <Tank level={dashboardData.waterAvailable ? 100 : 0} title="Inlet Water" />
                  </div>

                  <div className="absolute top-[115px] left-[850px] z-10 -translate-y-1/2 flex items-center">
                    <h3 className="text-white text-xs font-bold tracking-widest uppercase whitespace-nowrap">OUTLET</h3>
                  </div>

                  <div className="absolute top-[175px] left-[300px] z-10">
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

                  <div className="absolute top-[175px] left-[580px] z-10">
                    <PumpUnit
                      name={displayPump2.name}
                      status={displayPump2.status}
                      currentR={displayPump2.currentR}
                      currentY={displayPump2.currentY}
                      currentB={displayPump2.currentB}
                      mode={displayPump2.mode}
                      runOnTime={displayPump2.runOnTime}
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
          <SystemHealthCard faults={totalFaults + dashboardData.inputPowerFaultType} />
          <BottomStatusBar
            faults={totalFaults + dashboardData.inputPowerFaultType}
            runningPumps={runningPumps}
            totalPumps={2}
            waterLevel={dashboardData.waterAvailable ? 100 : 0}
          />
        </div>
        <div className="col-span-1 md:col-span-1 lg:col-span-4 flex flex-col">
          <QuickStatusCard
            powerStatus={dashboardData.inputPowerFaultType === 0 ? 'OK' : 'FAULT'}
          />
        </div>
        <div className="col-span-1 md:col-span-1 lg:col-span-4 flex flex-col">
          <SystemInfoCard systemName={title} location={buildingName} panelId={panelId} />
        </div>
      </div>

    </div>
  );
};
