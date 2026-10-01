import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { Maximize, Minimize, AlertTriangle, Database } from 'lucide-react';
import { VoltageCard } from './components/VoltageCard';
import { InputPowerCard } from './components/InputPowerCard';
import { PressureCard } from './components/PressureCard';
import { TxCard } from './components/TxCard';
import { DelaySettingsCard } from './components/DelaySettingsCard';
import { FaultResetCard } from './components/FaultResetCard';
import { PressureTrendCard } from './components/PressureTrendCard';
import { ProcessFlowContainer } from './components/ProcessFlow/PipeNetwork';

import { api } from '../../../../lib/api';
import type { RootState } from '../../../../store';
import { audioBuzzer } from '../../../../utils/audioBuzzer';
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
  const { user, buildingIds, accessToken } = useSelector((state: RootState) => state.auth);
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

  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

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

        const modeKey = `pump${n}Status`;
        if (data[modeKey] !== undefined) {
          const mVal = Number(data[modeKey]);
          if (mVal === 2) p.mode = 'OFF';
          else if (mVal === 20 || mVal === 22) p.mode = 'MANUAL';
          else if (mVal === 1 || mVal === 10 || mVal === 11) p.mode = 'AUTO';
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

    api.get(`/alerts/${panelId}/active`)
      .then(r => {
        if (r.data) setActiveAlerts(r.data);
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

    socket.on('device-alert', (alert: any) => {
      if (alert.deviceId === panelId) {
        setActiveAlerts((prev) => [alert, ...prev]);
        audioBuzzer.playAlertSound(alert.type, alert.intensity || 1);
      }
    });

    socket.on('device-alert-resolved', (alert: any) => {
      if (alert.deviceId === panelId) {
        setActiveAlerts((prev) => prev.filter(a => a.id !== alert.id));
        audioBuzzer.playResolvedChime();
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
    <div ref={dashboardRef} className={`scada-dashboard p-4 lg:p-6 ${isFullscreen ? 'bg-gray-50 h-screen overflow-y-auto' : 'lg:pb-12'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 -mt-2">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">{title}</h1>
            <p className="text-xs font-semibold text-gray-500 tracking-wider uppercase flex items-center gap-2">
              <span>{buildingName}</span>
              {panelId && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="text-gray-400">MAC: {panelId}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {panelId && (
            <button
              onClick={() => navigate(`/devices/${panelId}`)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all flex items-center gap-1.5 text-xs font-bold text-gray-700 shadow-sm cursor-pointer"
              title="View Live Register Values & Alert Rules"
            >
              <Database size={14} className="text-emerald-600" />
              <span>Registers</span>
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center text-gray-600 shadow-sm"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

      {activeAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-500 shrink-0" size={24} />
            <div>
              <h3 className="text-red-800 font-bold">System Alerts ({activeAlerts.length})</h3>
              <p className="text-red-600 text-sm font-medium">
                {activeAlerts[0].message} {activeAlerts.length > 1 ? `(+ ${activeAlerts.length - 1} more active alerts)` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="scada-grid-layout">
        {/* ROW 1: Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          <VoltageCard
            voltageR={dashboardData.ryVoltage}
            voltageY={dashboardData.ybVoltage}
            voltageB={dashboardData.rbVoltage}
          />
          <InputPowerCard
            currentR={totalCurrentR}
            currentY={totalCurrentY}
            currentB={totalCurrentB}
            inputPowerStatus={dashboardData.inputPowerFaultType}
          />
          {showPressureCard ? (
            <PressureCard pressure={dashboardData.pressureBar} />
          ) : (
            <div></div> // Placeholder if no pressure card
          )}
          <TxCard isConnected={dashboardData.transmitterConnected} />
        </div>

        {/* ROW 2: Process Flow */}
        <div className="w-full">
          <ProcessFlowContainer
            pumps={visiblePumps}
            dashboardData={dashboardData}
            inletTankTitle={inletTankTitle}
            outletTitle={outletTitle}
            outletType={outletType}
          />
        </div>

        {/* ROW 3: Trends & Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          <PressureTrendCard />
          <DelaySettingsCard
            pumpOnDelay={dashboardData.pumpOnDelay}
            nextFillingTime={dashboardData.nextFillingTime}
            overloadResetDelay={dashboardData.overloadResetDelay}
            underloadResetDelay={dashboardData.underloadResetDelay}
            vfdResetAfter={dashboardData.vfdResetAfter}
          />
          <FaultResetCard hasFault={totalFaults > 0 || dashboardData.inputPowerFaultType > 0} />
        </div>
      </div>
    </div>
  );
};
