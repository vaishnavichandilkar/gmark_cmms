import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  isVisible: boolean; // Based on motorXConfigActivate
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
  pumpOnDelay: number;
  nextFillingTime: number;
  overloadResetDelay: number;
  underloadResetDelay: number;
}

export const BoosterDashboard: React.FC<BoosterDashboardProps> = ({
  title: initialTitle,
  panelId: initialPanelId,
  buildingName: initialBuildingName,
  inletTankTitle: initialInletTankTitle = 'Inlet Water',
  outletType: initialOutletType = 'label',
  outletTitle: initialOutletTitle = 'OUTLET',
  showPressureCard: initialShowPressureCard = true
}) => {
  const location = useLocation();
  const state = location.state as any;

  const title = state?.title ?? initialTitle;
  const panelId = state?.panelId ?? initialPanelId;
  const buildingName = state?.buildingName ?? initialBuildingName;
  const inletTankTitle = state?.inletTankTitle ?? initialInletTankTitle;
  const outletType = state?.outletType ?? initialOutletType;
  const outletTitle = state?.outletTitle ?? initialOutletTitle;
  const showPressureCard = state?.showPressureCard ?? initialShowPressureCard;
  const deviceTopic = panelId;

  // Initialize all 4 pumps
  const [pumps, setPumps] = useState<PumpState[]>([
    { id: '1', name: 'Pump 1', status: 'OFFLINE', currentR: 0, currentY: 0, currentB: 0, mode: 'AUTO', runOnTime: '0:0 Hrs', faults: 0, isVisible: false },
    { id: '2', name: 'Pump 2', status: 'OFFLINE', currentR: 0, currentY: 0, currentB: 0, mode: 'AUTO', runOnTime: '0:0 Hrs', faults: 0, isVisible: false },
    { id: '3', name: 'Pump 3', status: 'OFFLINE', currentR: 0, currentY: 0, currentB: 0, mode: 'AUTO', runOnTime: '0:0 Hrs', faults: 0, isVisible: false },
    { id: '4', name: 'Pump 4', status: 'OFFLINE', currentR: 0, currentY: 0, currentB: 0, mode: 'AUTO', runOnTime: '0:0 Hrs', faults: 0, isVisible: false },
  ]);

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
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const processPayload = (data: any, isInitial: boolean) => {
    setPumps(prev => {
      const newPumps = [...prev];

      // Helper to safely extract boolean
      const getBool = (val: any) => typeof val === 'boolean' ? val : (Number(val) > 0);

      for (let i = 0; i < 4; i++) {
        const n = i + 1;
        const statusKey = `motor${n}Status`;
        const rCurrKey = `motor${n}RCurrent`;
        const yCurrKey = `motor${n}YCurrent`;
        const bCurrKey = `motor${n}BCurrent`;
        const faultKey = `pump${n}FaultType`;
        const timeKey = `motor${n}RunTime`;
        const configKey = `motor${n}ConfigActivate`;

        const p = { ...newPumps[i] };

        if (data[rCurrKey] !== undefined) p.currentR = Number(data[rCurrKey]) || 0;
        if (data[yCurrKey] !== undefined) p.currentY = Number(data[yCurrKey]) || 0;
        if (data[bCurrKey] !== undefined) p.currentB = Number(data[bCurrKey]) || 0;
        if (data[faultKey] !== undefined) p.faults = Number(data[faultKey]) || 0;
        if (data[timeKey] !== undefined) p.runOnTime = `${data[timeKey]} Hrs`;

        if (data[configKey] !== undefined) {
          p.isVisible = getBool(data[configKey]);
        }

        // Apply Priority Logic
        if (p.faults > 0) {
          p.status = 'FAULT';
        } else if (data[statusKey] !== undefined) {
          p.status = getBool(data[statusKey]) ? 'RUNNING' : 'OFF';
        } else if (isInitial) {
          // If this is initial load and no status was provided but pump doesn't have a fault, fallback to OFF
          p.status = 'OFF';
        }

        newPumps[i] = p;
      }
      return newPumps;
    });

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
      inputPowerFaultType: data.inputPowerFaultType ?? prev.inputPowerFaultType,
      pumpOnDelay: data.pumpOnDelay ?? prev.pumpOnDelay,
      nextFillingTime: data.nextFillingTime ?? prev.nextFillingTime,
      overloadResetDelay: data.overloadResetDelay ?? prev.overloadResetDelay,
      underloadResetDelay: data.underloadResetDelay ?? prev.underloadResetDelay
    }));
  };

  useEffect(() => {
    if (!panelId) return;

    fetch(`http://localhost:3000/devices/${panelId}/dashboard`)
      .then(r => r.json())
      .then(res => {
        if (res && !res.error && res.latestData) {
          processPayload(res.latestData, true);
        }
      })
      .catch(console.error);

    const socket = io('http://localhost:3000');

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
  }, [panelId, deviceTopic]);

  // Filter visible pumps dynamically
  const visiblePumps = pumps.filter(p => p.isVisible);

  // To avoid breaking the UI before data arrives or if all are disabled, 
  // we can show a placeholder or just render whatever is visible.

  const totalFaults = visiblePumps.reduce((sum, p) => sum + p.faults, 0);
  const totalCurrentR = visiblePumps.reduce((sum, p) => sum + p.currentR, 0);
  const totalCurrentY = visiblePumps.reduce((sum, p) => sum + p.currentY, 0);
  const totalCurrentB = visiblePumps.reduce((sum, p) => sum + p.currentB, 0);
  const totalPower = dashboardData.averageVoltage > 0
    ? (totalCurrentR * dashboardData.averageVoltage * 1.732 * 0.8 / 1000)
    : 0;

  const hasFlow = visiblePumps.some(p => p.status === 'RUNNING');

  // Dynamic layout calculations
  const pumpSpacing = 270;
  const isTankOutlet = outletType === 'tank';

  const leftTankLeft = 20;
  const leftTankCenter = leftTankLeft + 64;

  // Calculate X positions for pumps based on index
  const pumpLefts = visiblePumps.map((_, idx) => leftTankLeft + 155 + (idx * pumpSpacing));
  const pumpCenters = pumpLefts.map(left => left + 130);

  // Determine canvas width based on the last pump
  const numPumps = visiblePumps.length || 1; // Minimum width calculation safety
  let rightTankLeft = leftTankLeft + 155 + (numPumps * pumpSpacing) + 17;
  let outletEndX = rightTankLeft + 2;

  const canvasWidth = rightTankLeft + (isTankOutlet ? 150 : 100);

  const tankBottomY = 550;
  const manifoldY = isTankOutlet ? 85 : 55;
  return (
    <div
      className="min-h-screen p-4 md:p-6 lg:p-8 overflow-hidden font-sans relative"
      style={{
        backgroundColor: '#000000',
        zoom: 0.8
      }}
    >
      <ScadaHeader title={title} />

      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT PANEL */}
        <div className="w-full flex-1 flex flex-col min-w-[300px]">
          <PerformanceCard
            voltageR={dashboardData.ryVoltage}
            voltageY={dashboardData.ybVoltage}
            voltageB={dashboardData.rbVoltage}
            currentR={totalCurrentR}
            currentY={totalCurrentY}
            currentB={totalCurrentB}
            power={totalPower}
          />
          {showPressureCard && (
            <PressureCard
              pressure={dashboardData.pressureBar}
              isConnected={dashboardData.transmitterConnected}
            />
          )}
          <DelaySettingsCard
            pumpOnDelay={dashboardData.pumpOnDelay}
            nextFillingTime={dashboardData.nextFillingTime}
            overloadResetDelay={dashboardData.overloadResetDelay}
            underloadResetDelay={dashboardData.underloadResetDelay}
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
                    <div className="absolute text-[10px] text-gray-400 font-bold whitespace-nowrap leading-tight text-left z-0" style={{ left: `${leftTankCenter + 16}px`, top: '560px' }}>FROM<br />TANK</div>

                    {visiblePumps.length > 0 && (
                      <>
                        <Pipe
                          path={`M ${leftTankCenter} ${tankBottomY} L ${leftTankCenter} ${680 - 16} A 16 16 0 0 0 ${leftTankCenter + 16} 680 L ${visiblePumps.length === 1 ? pumpCenters[0] - 16 : pumpCenters[0]} 680`}
                          flowDirection={hasFlow ? 'forward' : 'none'}
                        />

                        {/* Connecting Inlet manifold to all pumps */}
                        {/* Vertical branches (rendered first to sit behind the main manifold) */}
                        {visiblePumps.map((p, i) => {
                          const isRunning = p.status === 'RUNNING';
                          const isLast = i === visiblePumps.length - 1;
                          return (
                            <React.Fragment key={`inlet-pipe-vert-${p.id}`}>
                              {isLast ? (
                                <Pipe path={`M ${pumpCenters[i] - 16} 680 A 16 16 0 0 0 ${pumpCenters[i]} ${680 - 16} L ${pumpCenters[i]} 585`} flowDirection={isRunning ? 'forward' : 'none'} />
                              ) : (
                                <Pipe path={`M ${pumpCenters[i]} 680 L ${pumpCenters[i]} 585`} flowDirection={isRunning ? 'forward' : 'none'} capStyle="butt" />
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* Horizontal manifold segments (rendered on top for a clean continuous line) */}
                        {visiblePumps.map((p, i) => {
                          const isLast = i === visiblePumps.length - 1;
                          const nextRunning = visiblePumps.slice(i + 1).some(op => op.status === 'RUNNING');
                          return (
                            <React.Fragment key={`inlet-pipe-horiz-${p.id}`}>
                              {!isLast && (
                                <Pipe path={`M ${pumpCenters[i]} 680 L ${i + 1 === visiblePumps.length - 1 ? pumpCenters[i + 1] - 16 : pumpCenters[i + 1]} 680`} flowDirection={nextRunning ? 'forward' : 'none'} />
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* Connecting Outlet manifold to all pumps */}
                        {/* Vertical branches (rendered first to sit behind the main manifold) */}
                        {visiblePumps.map((p, i) => {
                          const isRunning = p.status === 'RUNNING';
                          return (
                            <React.Fragment key={`outlet-pipe-vert-${p.id}`}>
                              {i === 0 ? (
                                <Pipe path={`M ${pumpCenters[i]} 145 L ${pumpCenters[i]} ${manifoldY + 16} A 16 16 0 0 1 ${pumpCenters[i] + 16} ${manifoldY}`} flowDirection={isRunning ? 'forward' : 'none'} />
                              ) : (
                                <Pipe path={`M ${pumpCenters[i]} 145 L ${pumpCenters[i]} ${manifoldY}`} flowDirection={isRunning ? 'forward' : 'none'} capStyle="butt" />
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* Horizontal manifold segments (rendered on top for a clean continuous line) */}
                        {visiblePumps.map((p, i) => {
                          const isLast = i === visiblePumps.length - 1;
                          const currentOrPrevRunning = visiblePumps.slice(0, i + 1).some(op => op.status === 'RUNNING');
                          return (
                            <React.Fragment key={`outlet-pipe-horiz-${p.id}`}>
                              <Pipe
                                path={`M ${i === 0 ? pumpCenters[i] + 16 : pumpCenters[i]} ${manifoldY} L ${isLast ? (isTankOutlet ? rightTankLeft + 64 - 16 : outletEndX) : pumpCenters[i + 1]} ${manifoldY}`}
                                flowDirection={currentOrPrevRunning ? 'forward' : 'none'}
                              />
                            </React.Fragment>
                          );
                        })}

                        {/* Final tank connection */}
                        {isTankOutlet && (
                          <Pipe
                            path={`M ${rightTankLeft + 64 - 16} ${manifoldY} A 16 16 0 0 1 ${rightTankLeft + 64} ${manifoldY + 16} L ${rightTankLeft + 64} ${manifoldY + 55}`}
                            flowDirection={hasFlow ? 'forward' : 'none'}
                          />
                        )}
                      </>
                    )}
                  </div>

                  {/* Elements */}
                  <div className="absolute z-10" style={{ left: `${leftTankLeft}px`, top: '285px' }}>
                    <Tank level={dashboardData.waterAvailable ? 100 : 0} title={inletTankTitle} />
                  </div>

                  {isTankOutlet ? (
                    <>
                      <div className="absolute z-10 w-32 flex justify-center text-center" style={{ left: `${rightTankLeft}px`, top: '45px' }}>
                        <h3 className="text-white text-xs font-bold tracking-widest uppercase leading-tight">
                          {outletTitle.split(' ').map((word: string, index: number) => (
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

                  {visiblePumps.map((p, idx) => (
                    <div key={p.id} className="absolute top-[145px] z-10" style={{ left: `${pumpLefts[idx]}px` }}>
                      <PumpUnit
                        name={p.name}
                        status={p.status}
                        currentR={p.currentR}
                        currentY={p.currentY}
                        currentB={p.currentB}
                        mode={p.mode}
                        runOnTime={p.runOnTime}
                      />
                    </div>
                  ))}

                  {visiblePumps.length === 0 && (
                    <div
                      className="absolute z-10 flex items-center justify-center pointer-events-none"
                      style={{
                        left: `${leftTankLeft + 155}px`,
                        top: '145px',
                        width: '260px',
                        height: '350px'
                      }}
                    >
                      <div className="bg-[#0f172a]/80 px-6 py-6 rounded-[24px] border border-white/10 text-[rgba(255,255,255,0.45)] font-bold text-[14px] uppercase tracking-widest text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
                        No Pumps Configured in Panel
                      </div>
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
