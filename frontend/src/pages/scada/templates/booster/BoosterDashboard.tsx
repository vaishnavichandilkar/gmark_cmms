import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { ScadaHeader } from './components/ScadaHeader';
import { PerformanceCard } from './components/PerformanceCard';
import { PressureCard } from './components/PressureCard';
import { DelaySettingsCard } from './components/DelaySettingsCard';
import { FaultResetCard } from './components/FaultResetCard';
import { QuickStatusCard } from './components/QuickStatusCard';
import { SystemInfoCard } from './components/SystemInfoCard';
import { ProcessFlowContainer } from './components/ProcessFlow/PipeNetwork';
import { api } from '../../../../lib/api';
import type { RootState } from '../../../../store';
import './scada.css'; // Will create this

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
  isVisible: boolean;
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
  vfdResetAfter: number;
}

export const BoosterDashboard: React.FC<BoosterDashboardProps> = ({
  title: initialTitle,
  panelId: initialPanelId,
  buildingName: initialBuildingName,
  inletTankTitle: initialInletTankTitle = 'Underground Tank',
  outletType: initialOutletType = 'label',
  outletTitle: initialOutletTitle = 'OUTLET',
  showPressureCard: initialShowPressureCard = true
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, buildingIds } = useSelector((state: RootState) => state.auth);
  const state = location.state as any;

  const title = state?.title ?? initialTitle;
  const panelId = state?.panelId ?? initialPanelId;
  const buildingName = state?.buildingName ?? initialBuildingName;
  const inletTankTitle = state?.inletTankTitle ?? initialInletTankTitle;
  const outletType = state?.outletType ?? initialOutletType;
  const outletTitle = state?.outletTitle ?? initialOutletTitle;
  const showPressureCard = state?.showPressureCard ?? initialShowPressureCard;
  const deviceTopic = panelId;

  const [pumps, setPumps] = useState<PumpState[]>([
    { id: '1', name: 'Pump 1', status: 'OFFLINE', currentR: 0, currentY: 0, currentB: 0, mode: 'AUTO', runOnTime: '0:0 Hrs', faults: 0, isVisible: true },
    { id: '2', name: 'Pump 2', status: 'OFFLINE', currentR: 0, currentY: 0, currentB: 0, mode: 'AUTO', runOnTime: '0:0 Hrs', faults: 0, isVisible: true },
    { id: '3', name: 'Pump 3', status: 'OFFLINE', currentR: 0, currentY: 0, currentB: 0, mode: 'AUTO', runOnTime: '0:0 Hrs', faults: 0, isVisible: false },
    { id: '4', name: 'Pump 4', status: 'OFFLINE', currentR: 0, currentY: 0, currentB: 0, mode: 'AUTO', runOnTime: '0:0 Hrs', faults: 0, isVisible: false },
  ]);

  const [dashboardData, setDashboardData] = useState<DashboardState>({
    averageVoltage: 0, ryVoltage: 0, ybVoltage: 0, rbVoltage: 0,
    pressureBar: 0, transmitterConnected: false, waterAvailable: false,
    deviceActive: false, inputPowerFaultType: 0,
    pumpOnDelay: 0, nextFillingTime: 0, overloadResetDelay: 0, underloadResetDelay: 0,
    vfdResetAfter: 0
  });

  const processPayload = (data: any, isInitial: boolean) => {
    setPumps(prev => {
      const newPumps = [...prev];
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
        } else if (isInitial) {
          const hasData = (data[statusKey] !== undefined && getBool(data[statusKey])) ||
            (data[rCurrKey] !== undefined && Number(data[rCurrKey]) > 0) ||
            (data[yCurrKey] !== undefined && Number(data[yCurrKey]) > 0) ||
            (data[bCurrKey] !== undefined && Number(data[bCurrKey]) > 0) ||
            (data[faultKey] !== undefined && Number(data[faultKey]) > 0) ||
            (data[timeKey] !== undefined && Number(data[timeKey]) > 0);
          if (n <= 2) {
            p.isVisible = true;
          } else {
            p.isVisible = hasData;
          }
        }

        if (p.faults > 0) {
          p.status = 'FAULT';
        } else if (data[statusKey] !== undefined) {
          p.status = getBool(data[statusKey]) ? 'RUNNING' : 'OFF';
        } else if (isInitial) {
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
      underloadResetDelay: data.underloadResetDelay ?? prev.underloadResetDelay,
      vfdResetAfter: data.vfdResetAfter ?? prev.vfdResetAfter
    }));
  };

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'SOCIETY_ADMIN') {
      let bId = 0;
      if (buildingName === 'A Building') bId = 1;
      else if (buildingName === 'B Building') bId = 2;
      else if (buildingName === 'C Building') bId = 3;
      else if (buildingName === 'STP') bId = 4;

      if (bId > 0 && !buildingIds?.includes(bId)) {
        navigate('/', { replace: true });
      }
    }
  }, [user, buildingIds, buildingName, navigate]);

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

    const token = localStorage.getItem('token');
    const socket = io('http://localhost:3001', {
      auth: { token },
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
  }, [panelId, deviceTopic]);

  const visiblePumps = pumps.filter(p => p.isVisible);
  const totalFaults = visiblePumps.reduce((sum, p) => sum + p.faults, 0);
  const totalCurrentR = visiblePumps.reduce((sum, p) => sum + p.currentR, 0);
  const totalCurrentY = visiblePumps.reduce((sum, p) => sum + p.currentY, 0);
  const totalCurrentB = visiblePumps.reduce((sum, p) => sum + p.currentB, 0);

  return (
    <div className="scada-dashboard">
      <ScadaHeader title={title} isOnline={dashboardData.deviceActive} />

      <div className="scada-grid-layout">
        {/* LEFT COLUMN: Metrics & Settings */}
        <div className="scada-left-panel">
          <PerformanceCard
            voltageR={dashboardData.ryVoltage}
            voltageY={dashboardData.ybVoltage}
            voltageB={dashboardData.rbVoltage}
            currentR={totalCurrentR}
            currentY={totalCurrentY}
            currentB={totalCurrentB}
            inputPowerStatus={dashboardData.inputPowerFaultType}
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
            vfdResetAfter={dashboardData.vfdResetAfter}
          />

          <FaultResetCard hasFault={totalFaults > 0 || dashboardData.inputPowerFaultType > 0} />
          
          <div className="scada-footer-row">
            <QuickStatusCard powerStatus={dashboardData.inputPowerFaultType === 0 ? 'OK' : 'FAULT'} />
            <SystemInfoCard systemName={title} location={buildingName} panelId={panelId} />
          </div>
        </div>

        {/* RIGHT COLUMN: Process Flow / Diagram */}
        <div className="scada-right-panel">
          <ProcessFlowContainer 
            pumps={visiblePumps}
            dashboardData={dashboardData}
            inletTankTitle={inletTankTitle}
            outletTitle={outletTitle}
            outletType={outletType}
          />
        </div>
      </div>
    </div>
  );
};
