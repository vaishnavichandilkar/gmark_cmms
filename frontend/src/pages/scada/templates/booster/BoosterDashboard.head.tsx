import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ScadaHeader } from './components/ScadaHeader';
import { PerformanceCard } from './components/PerformanceCard';
import { PressureCard } from './components/PressureCard';
import { DelaySettingsCard } from './components/DelaySettingsCard';
import { FaultResetCard } from './components/FaultResetCard';
import { QuickStatusCard } from './components/QuickStatusCard';
import { SystemInfoCard } from './components/SystemInfoCard';
import { ProcessFlowContainer, Pipe } from './components/ProcessFlow/PipeNetwork';
import { Tank } from './components/ProcessFlow/Tank';
import { PumpUnit } from './components/ProcessFlow/PumpUnit';

export interface BoosterDashboardProps {
  title: string;
  panelId: string;
  buildingName: string;
  pump1Id?: string;
  pump2Id?: string;
  pump3Id?: string;
  inletTankTitle?: string;
  outletType?: 'label' | 'tank';
  outletTitle?: string;
  showPressureCard?: boolean;
}

interface PumpState {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'RUNNING' | 'FAULT' | 'WARNING' | 'OFF';
  currentR: number;
  currentY: number;
  currentB: number;
  mode: 'AUTO' | 'MANUAL' | 'OFF';
  runOnTime: string;
  faults: number;
}

interface DeviceUpdate {
  deviceId: string;
  registers: any;
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
  pumpOnDelay?: number;
  nextFillingTime?: number;
  overloadResetDelay?: number;
  underloadResetDelay?: number;
}

export const BoosterDashboard: React.FC<BoosterDashboardProps> = ({
  title,
  panelId,
  buildingName,
  pump1Id = '20260508012',
  pump2Id = '20260508045',
  pump3Id,
  inletTankTitle = 'Inlet Water',
  outletType = 'label',
  outletTitle = 'OUTLET',
  showPressureCard = true
}) => {

  const [pump1, setPump1] = useState<PumpState>({
    id: pump1Id, name: 'Pump 1', status: 'OFFLINE',
    currentR: 0, currentY: 0, currentB: 0, mode: 'AUTO', runOnTime: '0:0 Hrs', faults: 0
  });

  const [pump2, setPump2] = useState<PumpState>({
    id: pump2Id, name: 'Pump 2', status: 'OFFLINE',
    currentR: 0, currentY: 0, currentB: 0, mode: 'AUTO', runOnTime: '0:0 Hrs', faults: 0
  });

  const [pump3, setPump3] = useState<PumpState>({
    id: pump3Id || '', name: 'Pump 3', status: 'OFFLINE',
    currentR: 0, currentY: 0, currentB: 0, mode: 'AUTO', runOnTime: '0:0 Hrs', faults: 0
  });

  const [dashboardData, setDashboardData] = useState<DashboardState>({
    averageVoltage: 0, ryVoltage: 0, ybVoltage: 0, rbVoltage: 0,
    pressureBar: 0, transmitterConnected: false, waterAvailable: false,
    deviceActive: false, inputPowerFaultType: 0,
    pumpOnDelay: 0, nextFillingTime: 0, overloadResetDelay: 0, underloadResetDelay: 0
  });

  // Drag-to-scroll state and handlers
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [scrollLeft, setScrollLeft] = React.useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll-fast multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  useEffect(() => {
    const fetchPromises = [
      fetch(`http://localhost:3000/devices/${pump1Id}/dashboard`).then(r => r.json()).catch(() => null),
      fetch(`http://localhost:3000/devices/${pump2Id}/dashboard`).then(r => r.json()).catch(() => null)
    ];
    if (pump3Id) {
      fetchPromises.push(fetch(`http://localhost:3000/devices/${pump3Id}/dashboard`).then(r => r.json()).catch(() => null));
    }

    Promise.all(fetchPromises).then((results) => {
      const d1 = results[0];
      const d2 = results[1];
      const d3 = pump3Id ? results[2] : null;

      if (d1 && !d1.error) {
        const data = d1.latestData || {};
        setPump1((prev: PumpState) => ({
          ...prev,
          status: data.motor1Status ? 'RUNNING' : d1.status === 'online' ? 'ONLINE' : 'OFFLINE',
          currentR: data.motor1RCurrent || 0,
          currentY: data.motor1YCurrent || 0,
          currentB: data.motor1BCurrent || 0,
          mode: 'AUTO',
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
      if (d3 && !d3.error) {
        const data = d3.latestData || {};
        setPump3((prev: PumpState) => ({
          ...prev,
          status: data.motor1Status ? 'RUNNING' : d3.status === 'online' ? 'ONLINE' : 'OFFLINE',
          currentR: data.motor1RCurrent || 0,
          currentY: data.motor1YCurrent || 0,
          currentB: data.motor1BCurrent || 0,
          mode: 'AUTO',
          faults: data.pump1FaultType || 0,
          runOnTime: `${data.motor1RunTime || 0} Hrs`
        }));
      }
    });

    const socket = io('http://localhost:3000');
    socket.on('device-update', (update: DeviceUpdate) => {
      const data = update.registers || {};

      if (update.deviceId === pump1Id) {
        setPump1((prev: PumpState) => ({
          ...prev,
          status: data.motor1Status ? 'RUNNING' : 'ONLINE',
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
      if (pump3Id && update.deviceId === pump3Id) {
        setPump3((prev: PumpState) => ({
          ...prev,
          status: data.motor1Status ? 'RUNNING' : 'ONLINE',
          currentR: data.motor1RCurrent ?? prev.currentR,
          currentY: data.motor1YCurrent ?? prev.currentY,
          currentB: data.motor1BCurrent ?? prev.currentB,
          faults: data.pump1FaultType ?? prev.faults,
          runOnTime: data.motor1RunTime ? `${data.motor1RunTime} Hrs` : prev.runOnTime
        }));
      }
    });

    return () => { socket.disconnect(); };
  }, [pump1Id, pump2Id, pump3Id]);

  // FORCE PUMP 2 AND 3 OFF FOR DEMO
  const displayPump2 = { ...pump2, status: 'OFFLINE' as PumpState['status'], mode: 'OFF' as PumpState['mode'], currentR: 0, currentY: 0, currentB: 0 };
  const displayPump3 = { ...pump3, status: 'OFFLINE' as PumpState['status'], mode: 'OFF' as PumpState['mode'], currentR: 0, currentY: 0, currentB: 0 };

  const totalFaults = pump1.faults + displayPump2.faults + (pump3Id ? displayPump3.faults : 0);

  // Pipeline Flow Logic
  const pump1Running = pump1.status === 'RUNNING';
  const pump2Running = displayPump2.status === 'RUNNING';
  const pump3Running = pump3Id && (displayPump3.status === 'RUNNING');
  const hasFlow = pump1Running || pump2Running || pump3Running;

  // Dynamic layout calculations based on outletType and 3rd pump
  const isTankOutlet = outletType === 'tank';
  const hasPump3 = !!pump3Id;
  const canvasWidth = hasPump3 ? 1150 : 880;
  
  let leftTankLeft = 20;
  let pump1Left = 175;
  let pump2Left = 445;
  let pump3Left = 0;
  let rightTankLeft = 732;
  let outletEndX = 734;

  if (hasPump3 && isTankOutlet) {
    leftTankLeft = 20;
    pump1Left = 175;
    pump2Left = 445;
    pump3Left = 715;
    rightTankLeft = 1002;
    outletEndX = 1004;
  } else if (hasPump3 && !isTankOutlet) {
    leftTankLeft = 20;
    pump1Left = 175;
    pump2Left = 445;
    pump3Left = 715;
    outletEndX = 1002;
  } else if (!hasPump3 && isTankOutlet) {
    leftTankLeft = 20;
    pump1Left = 175;
    pump2Left = 445;
    rightTankLeft = 732;
    outletEndX = 734;
  } else if (!hasPump3 && !isTankOutlet) {
    leftTankLeft = 20;
    pump1Left = 175;
    pump2Left = 445;
    outletEndX = 732;
  }

  const leftTankCenter = leftTankLeft + 64;
  const pump1Center = pump1Left + 130;
  const pump2Center = pump2Left + 130;
  const pump3Center = pump3Left + 130;

  const fromTankLabelTop = isTankOutlet ? '530px' : '495px';
  const tankBottomY = isTankOutlet ? 501 : 431;
  const manifoldY = isTankOutlet ? 85 : 55;

  return (
    <div className="min-h-screen bg-[#021B3A] p-4 md:p-6 lg:p-8 overflow-hidden font-sans">
      <ScadaHeader title={title} />

      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT PANEL */}
        <div className="w-full flex-1 flex flex-col min-w-[300px]">
          <PerformanceCard
            voltageR={dashboardData.ryVoltage}
            voltageY={dashboardData.ybVoltage}
            voltageB={dashboardData.rbVoltage}
            currentR={pump1.currentR + pump2.currentR + (hasPump3 ? pump3.currentR : 0)}
            currentY={pump1.currentY + pump2.currentY + (hasPump3 ? pump3.currentY : 0)}
            currentB={pump1.currentB + pump2.currentB + (hasPump3 ? pump3.currentB : 0)}
            power={dashboardData.averageVoltage > 0 ? ((pump1.currentR + pump2.currentR + (hasPump3 ? pump3.currentR : 0)) * dashboardData.averageVoltage * 1.732 * 0.8 / 1000) : 0}
          />
          {showPressureCard && (
            <PressureCard
              pressure={dashboardData.pressureBar}
              isConnected={dashboardData.transmitterConnected}
            />
          )}
          <DelaySettingsCard 
            pumpOnDelay={dashboardData.pumpOnDelay || 0}
            nextFillingTime={dashboardData.nextFillingTime || 0}
            overloadResetDelay={dashboardData.overloadResetDelay || 0}
            underloadResetDelay={dashboardData.underloadResetDelay || 0}
          />
          <FaultResetCard hasFault={totalFaults > 0 || dashboardData.inputPowerFaultType > 0} />
        </div>

        {/* CENTER PROCESS FLOW */}
        <div className="w-full flex-initial flex flex-col overflow-hidden max-w-full" style={{ flexBasis: `${canvasWidth}px` }}>
          <div 
            ref={scrollRef}
            className={`w-full overflow-x-auto pb-2 custom-scrollbar relative rounded-[20px] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            <div style={{ minWidth: `${canvasWidth}px`, width: `${canvasWidth}px` }}>
              <ProcessFlowContainer>
                <div className="absolute right-0 top-0 h-full" style={{ width: `${canvasWidth}px` }}>
                  {/* Draw Pipes via absolute overlay */}
                  <div className="absolute inset-0 z-0">
                    <div className="absolute text-[10px] text-gray-400 font-bold whitespace-nowrap leading-tight text-left z-0" style={{ left: `${leftTankLeft}px`, top: fromTankLabelTop }}>FROM<br />TANK</div>
                    <Pipe x1={leftTankCenter} y1={tankBottomY} x2={leftTankCenter} y2={630} flowDirection={hasFlow ? 'forward' : 'none'} />
                    <Pipe x1={leftTankCenter} y1={630} x2={pump1Center} y2={630} flowDirection={hasFlow ? 'forward' : 'none'} />
                    
                    <Pipe x1={pump1Center} y1={630} x2={pump2Center} y2={630} flowDirection={pump2Running || pump3Running ? 'forward' : 'none'} />
                    <Pipe x1={pump1Center} y1={630} x2={pump1Center} y2={435} flowDirection={pump1Running ? 'forward' : 'none'} />
                    
                    <Pipe x1={pump2Center} y1={630} x2={pump2Center} y2={435} flowDirection={pump2Running ? 'forward' : 'none'} />
                    <Pipe x1={pump1Center} y1={145} x2={pump1Center} y2={manifoldY} flowDirection={pump1Running ? 'forward' : 'none'} />
                    <Pipe x1={pump2Center} y1={145} x2={pump2Center} y2={manifoldY} flowDirection={pump2Running ? 'forward' : 'none'} />
                    <Pipe x1={pump1Center} y1={manifoldY} x2={pump2Center} y2={manifoldY} flowDirection={pump1Running ? 'forward' : 'none'} />
                    
                    {hasPump3 && (
                      <>
                        <Pipe x1={pump2Center} y1={630} x2={pump3Center} y2={630} flowDirection={pump3Running ? 'forward' : 'none'} />
                        <Pipe x1={pump3Center} y1={630} x2={pump3Center} y2={435} flowDirection={pump3Running ? 'forward' : 'none'} />
                        <Pipe x1={pump3Center} y1={145} x2={pump3Center} y2={manifoldY} flowDirection={pump3Running ? 'forward' : 'none'} />
                        <Pipe x1={pump2Center} y1={manifoldY} x2={pump3Center} y2={manifoldY} flowDirection={pump1Running || pump2Running ? 'forward' : 'none'} />
                      </>
                    )}

                    <Pipe x1={hasPump3 ? pump3Center : pump2Center} y1={manifoldY} x2={isTankOutlet ? rightTankLeft + 64 : outletEndX} y2={manifoldY} flowDirection={hasFlow ? 'forward' : 'none'} />
                    {isTankOutlet && (
                      <Pipe x1={rightTankLeft + 64} y1={manifoldY} x2={rightTankLeft + 64} y2={manifoldY + 55} flowDirection={hasFlow ? 'forward' : 'none'} />
                    )}
                  </div>

                  {/* Elements */}
                  <div className="absolute z-10" style={{ left: `${leftTankLeft}px`, top: isTankOutlet ? '245px' : '175px' }}>
                    <Tank level={dashboardData.waterAvailable ? 100 : 0} title={inletTankTitle} />
                  </div>

                  {isTankOutlet ? (
                    <>
                      <div className="absolute z-10 w-32 flex justify-center text-center" style={{ left: `${rightTankLeft}px`, top: '45px' }}>
                        <h3 className="text-white text-xs font-bold tracking-widest uppercase leading-tight">
                          {outletTitle.split(' ').map((word, index) => (
                            <React.Fragment key={index}>
                              {word}
                              {index < outletTitle.split(' ').length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </h3>
                      </div>
                      <div className="absolute z-10" style={{ left: `${rightTankLeft}px`, top: '110px' }}>
                        <Tank level={75} title="" />
                      </div>
                    </>
                  ) : (
                    <div className="absolute top-[55px] z-10 -translate-y-1/2 flex items-center" style={{ left: `${outletEndX + 10}px` }}>
                      <h3 className="text-white text-xs font-bold tracking-widest uppercase whitespace-nowrap">{outletTitle}</h3>
                    </div>
                  )}

                  <div className="absolute top-[145px] z-10" style={{ left: `${pump1Left}px` }}>
                    <PumpUnit name={pump1.name} status={pump1.status} currentR={pump1.currentR} currentY={pump1.currentY} currentB={pump1.currentB} mode={pump1.mode} runOnTime={pump1.runOnTime} />
                  </div>

                  <div className="absolute top-[145px] z-10" style={{ left: `${pump2Left}px` }}>
                    <PumpUnit name={displayPump2.name} status={displayPump2.status} currentR={displayPump2.currentR} currentY={displayPump2.currentY} currentB={displayPump2.currentB} mode={displayPump2.mode} runOnTime={displayPump2.runOnTime} />
                  </div>

                  {hasPump3 && (
                    <div className="absolute top-[145px] z-10" style={{ left: `${pump3Left}px` }}>
                      <PumpUnit name={displayPump3.name} status={displayPump3.status} currentR={displayPump3.currentR} currentY={displayPump3.currentY} currentB={displayPump3.currentB} mode={displayPump3.mode} runOnTime={displayPump3.runOnTime} />
                    </div>
                  )}
                </div>
              </ProcessFlowContainer>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
        <div className="flex flex-col">
          <QuickStatusCard
            powerStatus={dashboardData.inputPowerFaultType === 0 ? 'OK' : 'FAULT'}
          />
        </div>
        <div className="flex flex-col">
          <SystemInfoCard systemName={title} location={buildingName} panelId={panelId} />
        </div>
      </div>

    </div>
  );
};
