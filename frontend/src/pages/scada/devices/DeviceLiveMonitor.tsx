import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Activity,
  Clock,
  Database,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { api } from '../../../lib/api';
import {
  RegisterAlertModal,
  type RegisterAlertConfigData,
} from '../../../components/scada/alerts/RegisterAlertModal';
import { DeviceHistoryConfigCard } from '../../../components/scada/history/DeviceHistoryConfigCard';
import { getDeviceDashboardRoute } from '../../../utils/deviceRoutes';
import { audioBuzzer } from '../../../utils/audioBuzzer';

interface Register {
  register: string | number;
  value: number | string;
}

interface SnapshotData {
  id: number;
  deviceId: string;
  payload: {
    registers?: Register[];
    [key: string]: any;
  };
  createdAt: string;
}

const REGISTER_NAMES: Record<number, string> = {
  40000: 'Device Activate',
  40001: 'Motor 1 ON/OFF',
  40002: 'Motor 2 ON/OFF',
  40003: 'Motor 3 ON/OFF',
  40004: 'Motor 4 ON/OFF',
  40005: 'Input Power Fault Type',
  40006: 'Average Input Supply',
  40007: 'R-Y Voltage',
  40008: 'Y-B Voltage',
  40009: 'R-B Voltage',
  40010: 'Motor 1 R Phase Current',
  40011: 'Motor 1 Y Phase Current',
  40012: 'Motor 1 B Phase Current',
  40013: 'Motor 2 R Phase Current',
  40014: 'Motor 2 Y Phase Current',
  40015: 'Motor 2 B Phase Current',
  40016: 'Motor 3 R Phase Current',
  40017: 'Motor 3 Y Phase Current',
  40018: 'Motor 3 B Phase Current',
  40019: 'Motor 4 R Phase Current',
  40020: 'Motor 4 Y Phase Current',
  40021: 'Motor 4 B Phase Current',
  40022: 'INWL(DI1)',
  40023: 'Power Switch 1 ON/OFF',
  40024: 'Power Switch 2 ON/OFF',
  40025: 'Power Switch 3 ON/OFF',
  40026: 'Power Switch 4 ON/OFF',
  40027: 'Pressure Bar Value',
  40028: 'Transmitter Connection',
  40029: 'Pressure Bar Value in mA',
  40030: 'Delay for Pump ON',
  40031: 'Next Filling Time',
  40032: 'Over Load Reset Delay',
  40033: 'Under Load Reset Delay',
  40034: 'VFD Reset After',
  40035: 'Under Ground Tank Full/Empty',
  40036: 'Pressure Tank Pressure %',
  40043: 'Pump 1 Fault Type',
  40044: 'Pump 2 Fault Type',
  40045: 'Pump 3 Fault Type',
  40046: 'Pump 4 Fault Type',
  40047: 'Motor 1 ON Time',
  40048: 'Motor 2 ON Time',
  40049: 'Motor 3 ON Time',
  40050: 'Motor 4 ON Time',
  40089: 'Motor 1 Activate/Deactivate',
  40090: 'Motor 2 Activate/Deactivate',
  40091: 'Motor 3 Activate/Deactivate',
  40092: 'Motor 4 Activate/Deactivate',

  // Fire Panel Registers
  40141: 'Line-1 Main Pump On (Cmd)',
  40142: 'Line-2 Main Pump On (Cmd)',
  40143: 'Line-2 Jockey Pump On (Cmd)',
  40144: 'Line-1 Jockey Pump On (Cmd)',
  40145: 'DG On (Cmd)',
  40146: 'Line-2 Main Pump Off (Cmd)',
  40147: 'Line-2 Jockey Pump Off (Cmd)',
  40148: 'Line-1 Jockey Pump Off (Cmd)',

  40151: 'Line-1 Main Pump Auto',
  40152: 'Line-1 Main Pump Manual',
  40153: 'Line-1 Main Pump ON',
  40154: 'Line-1 Main Pump OFF',
  40155: 'Line-1 Main Pump Trip',
  40156: 'UZ Line-1 Pressure',
  40157: 'UZ Line-2 Pressure',

  40161: 'Line-2 Main Pump Auto',
  40162: 'Line-2 Main Pump Manual',
  40163: 'Line-2 Main Pump ON',
  40164: 'Line-2 Main Pump OFF',
  40165: 'Line-2 Main Pump Trip',

  40166: 'Line-1 Jockey Pump Auto',
  40167: 'Line-1 Jockey Pump Manual',
  40168: 'Line-1 Jockey Pump ON',
  40169: 'Line-1 Jockey Pump OFF',
  40170: 'Line-1 Jockey Pump Trip',

  40171: 'DG Auto ON',
  40172: 'DG Manual ON',
};

export function DeviceLiveMonitor() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Alert State
  const [alertConfigs, setAlertConfigs] = useState<Record<number, RegisterAlertConfigData>>({});
  const [activeAlerts, setActiveAlerts] = useState<Record<string, any>>({});
  const [selectedRegisterForAlert, setSelectedRegisterForAlert] = useState<{
    registerNumber: number;
    registerName?: string;
    currentValue?: number | string;
    existingConfig?: RegisterAlertConfigData | null;
  } | null>(null);

  // Fetch initial snapshot and alert configurations
  useEffect(() => {
    if (!deviceId) return;

    const fetchData = async () => {
      try {
        const [snapRes, configRes, activeRes] = await Promise.allSettled([
          api.get(`/devices/${deviceId}/snapshot`),
          api.get(`/alerts/config/${deviceId}`),
          api.get(`/alerts/${deviceId}/active`),
        ]);

        // Process Snapshot
        if (snapRes.status === 'fulfilled') {
          const data: SnapshotData = snapRes.value.data;
          if (data.payload && Array.isArray(data.payload.registers)) {
            setRegisters(data.payload.registers);
          } else {
            const rawRegs: Register[] = [];
            if (data.payload) {
              Object.entries(data.payload).forEach(([k, v]) => {
                if (k !== 'registers') {
                  rawRegs.push({ register: k, value: String(v) });
                }
              });
            }
            setRegisters(rawRegs);
          }
          setLastUpdate(new Date(data.createdAt));
        }

        // Process Alert Configs
        if (configRes.status === 'fulfilled' && Array.isArray(configRes.value.data)) {
          const confMap: Record<number, RegisterAlertConfigData> = {};
          configRes.value.data.forEach((c: RegisterAlertConfigData) => {
            confMap[Number(c.registerNumber)] = c;
          });
          setAlertConfigs(confMap);
        }

        // Process Active Alerts
        if (activeRes.status === 'fulfilled' && Array.isArray(activeRes.value.data)) {
          const actMap: Record<string, any> = {};
          activeRes.value.data.forEach((a: any) => {
            if (a.triggerKey) {
              actMap[a.triggerKey] = a;
            }
          });
          setActiveAlerts(actMap);
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          setError(err.response?.data?.message || err.message || 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deviceId]);

  // Setup Socket.IO connection
  useEffect(() => {
    if (!deviceId) return;

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const socket: Socket = io('http://localhost:3001', {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join-device', { topic: deviceId });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('device-update', (data: any) => {
      if (data.deviceId === deviceId) {
        if (data.rawRegisters && Array.isArray(data.rawRegisters)) {
          setRegisters((prev) => {
            const mergedMap = new Map<number, number | string>();
            prev.forEach((r) => {
              mergedMap.set(Number(r.register), r.value);
            });
            data.rawRegisters.forEach((r: any) => {
              mergedMap.set(Number(r.register), r.value);
            });
            const mergedList = Array.from(mergedMap.entries()).map(
              ([register, value]) => ({
                register,
                value,
              }),
            );
            mergedList.sort((a, b) => Number(a.register) - Number(b.register));
            return mergedList;
          });
          setLastUpdate(new Date());
        }
      }
    });

    socket.on('device-alert', (alert: any) => {
      if (alert.deviceId === deviceId && alert.triggerKey) {
        setActiveAlerts((prev) => ({ ...prev, [alert.triggerKey]: alert }));
        audioBuzzer.playAlertSound(alert.type, alert.intensity || 1);
      }
    });

    socket.on('device-alert-resolved', (alert: any) => {
      if (alert.deviceId === deviceId && alert.triggerKey) {
        setActiveAlerts((prev) => {
          const updated = { ...prev };
          delete updated[alert.triggerKey];
          return updated;
        });
        audioBuzzer.playResolvedChime();
      }
    });

    return () => {
      socket.emit('leave-device', { topic: deviceId });
      socket.disconnect();
    };
  }, [deviceId]);

  const handleAlertConfigSaved = useCallback(
    (savedConfig: RegisterAlertConfigData | null) => {
      if (!selectedRegisterForAlert) return;
      const rawNum = selectedRegisterForAlert.registerNumber;
      const normNum = rawNum < 40000 ? rawNum + 40000 : rawNum;

      setAlertConfigs((prev) => {
        const next = { ...prev };
        if (savedConfig) {
          next[savedConfig.registerNumber] = savedConfig;
          next[rawNum] = savedConfig;
          next[normNum] = savedConfig;
        } else {
          delete next[rawNum];
          delete next[normNum];
        }
        return next;
      });

      if (!savedConfig || !savedConfig.enabled) {
        setActiveAlerts((prev) => {
          const updated = { ...prev };
          delete updated[`reg_${rawNum}`];
          delete updated[`reg_${normNum}`];
          return updated;
        });
      }
    },
    [selectedRegisterForAlert],
  );

  const group1 = registers.filter((r) => {
    const regNum = Number(r.register);
    const norm = regNum < 40000 ? regNum + 40000 : regNum;
    return norm <= 40070;
  });

  const group2 = registers.filter((r) => {
    const regNum = Number(r.register);
    const norm = regNum < 40000 ? regNum + 40000 : regNum;
    return norm > 40070;
  });

  const totalConfiguredAlerts = Object.values(alertConfigs).filter((c) => c.enabled).length;
  const totalActiveAlerts = Object.keys(activeAlerts).length;

  const renderRegisterCard = (reg: Register, idx: number) => {
    const isZero = Number(reg.value) === 0;
    const regNum = Number(reg.register);
    const normReg = regNum < 40000 ? regNum + 40000 : regNum;
    const registerName = REGISTER_NAMES[normReg];

    // Check alert rule by normalized or raw address
    const alertConfig = alertConfigs[normReg] || alertConfigs[regNum];
    const triggerKey = `reg_${alertConfig ? alertConfig.registerNumber : (regNum < 40000 ? normReg : regNum)}`;
    const rawTriggerKey = `reg_${regNum}`;
    const activeAlert = activeAlerts[triggerKey] || activeAlerts[rawTriggerKey];
    const isAlertActive = Boolean(activeAlert);

    let borderColor = 'border-gray-200 hover:border-emerald-300';
    let cardBg = 'bg-white';

    if (isAlertActive) {
      if (alertConfig?.alertType === 'EMERGENCY') {
        borderColor = 'border-red-500 ring-2 ring-red-400/40 shadow-red-100 shadow-md animate-pulse';
        cardBg = 'bg-red-50/70';
      } else if (alertConfig?.alertType === 'WARNING') {
        borderColor = 'border-amber-500 ring-2 ring-amber-400/40 shadow-amber-100 shadow-md animate-pulse';
        cardBg = 'bg-amber-50/70';
      } else {
        borderColor = 'border-blue-500 ring-2 ring-blue-400/40 shadow-blue-100 shadow-md';
        cardBg = 'bg-blue-50/70';
      }
    } else if (alertConfig && alertConfig.enabled) {
      borderColor = 'border-emerald-200 hover:border-emerald-400';
    }

    return (
      <div
        key={idx}
        className={`relative ${cardBg} border ${borderColor} rounded-xl p-2.5 flex flex-col items-center justify-between text-center group hover:shadow-md transition-all duration-200 min-h-[82px] shadow-sm`}
      >
        {/* Top bar: Register Number + Alert Bell button */}
        <div className="w-full flex items-center justify-between gap-1 mb-1">
          <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase font-mono">
            Reg {reg.register}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRegisterForAlert({
                registerNumber: alertConfig?.registerNumber ?? (regNum < 40000 ? normReg : regNum),
                registerName: registerName || `Register ${normReg}`,
                currentValue: reg.value,
                existingConfig: alertConfig || null,
              });
            }}
            className={`p-1 rounded-md transition-all cursor-pointer ${
              isAlertActive
                ? alertConfig?.alertType === 'EMERGENCY'
                  ? 'text-red-600 bg-red-100 hover:bg-red-200'
                  : 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                : alertConfig && alertConfig.enabled
                ? alertConfig.alertType === 'EMERGENCY'
                  ? 'text-red-500 hover:bg-red-50'
                  : alertConfig.alertType === 'WARNING'
                  ? 'text-amber-500 hover:bg-amber-50'
                  : 'text-blue-500 hover:bg-blue-50'
                : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title={
              alertConfig
                ? `Alert Configured: ${alertConfig.conditionType} ${alertConfig.conditionValue} (${alertConfig.alertType})`
                : 'Click to configure alert'
            }
          >
            <Bell size={13} className={isAlertActive ? 'animate-bounce text-red-600' : ''} />
          </button>
        </div>

        {/* Value */}
        <div
          className={`font-mono text-lg font-black tracking-tight ${
            isAlertActive
              ? 'text-red-700 font-extrabold'
              : isZero
              ? 'text-gray-400'
              : 'text-gray-900 group-hover:text-emerald-600'
          } transition-colors my-auto`}
        >
          {reg.value}
        </div>

        {/* Alert Rule Badge */}
        {alertConfig && alertConfig.enabled && (
          <div className="mt-1 w-full flex items-center justify-center">
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono truncate max-w-full ${
                isAlertActive
                  ? 'bg-red-600 text-white font-black animate-pulse'
                  : alertConfig.alertType === 'EMERGENCY'
                  ? 'bg-red-100 text-red-700'
                  : alertConfig.alertType === 'WARNING'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {alertConfig.conditionType === 'GREATER_THAN' && `> ${alertConfig.conditionValue}`}
              {alertConfig.conditionType === 'LESS_THAN' && `< ${alertConfig.conditionValue}`}
              {alertConfig.conditionType === 'EQUAL_TO' && `== ${alertConfig.conditionValue}`}
              {alertConfig.conditionType === 'NOT_EQUAL_TO' && `!= ${alertConfig.conditionValue}`}
              {alertConfig.conditionType === 'GTE' && `>= ${alertConfig.conditionValue}`}
              {alertConfig.conditionType === 'LTE' && `<= ${alertConfig.conditionValue}`}
            </span>
          </div>
        )}

        {/* Premium Dark Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 origin-bottom pointer-events-none z-50 text-center bg-gray-900 px-3 py-2 rounded-xl text-white text-[11px] font-medium tracking-wide shadow-2xl border border-gray-700">
          <p className="font-bold text-white">{registerName || `Register ${normReg}`}</p>
          {alertConfig && (
            <p className="text-[10px] text-amber-300 mt-0.5">
              🔔 {alertConfig.alertType} (Lvl {alertConfig.intensity}): {alertConfig.conditionType} {alertConfig.conditionValue}
            </p>
          )}
          {isAlertActive && (
            <p className="text-[10px] text-red-400 font-bold mt-0.5 animate-pulse">
              ⚠️ Active: {activeAlert?.message}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-rose-500 mb-4 flex justify-center">
          <Activity size={48} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Error Loading Device</h2>
        <p className="text-gray-500">{error}</p>
        <button
          onClick={() => navigate('/devices')}
          className="mt-6 px-6 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm rounded-lg font-medium transition-colors cursor-pointer"
        >
          Back to Devices
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-1 md:px-2 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/devices')}
            className="w-11 h-11 bg-white border border-gray-200 shadow-sm rounded-full text-gray-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-lg md:text-xl font-black text-gray-900 tracking-tight uppercase truncate max-w-[200px] md:max-w-none">
                {deviceId}
              </h1>
              <div
                className={`flex items-center gap-2 px-2.5 py-0.5 rounded-full border shrink-0 ${
                  socketConnected
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                ></div>
                <span
                  className={`text-[9px] font-bold tracking-widest ${
                    socketConnected ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {socketConnected ? 'LIVE' : 'CONNECTING'}
                </span>
              </div>
              {(() => {
                const scadaRoute = deviceId ? getDeviceDashboardRoute(deviceId) : null;
                const hasScada = scadaRoute && scadaRoute !== `/devices/${deviceId}`;
                if (!hasScada) return null;
                return (
                  <button
                    type="button"
                    onClick={() => navigate(scadaRoute)}
                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ml-1"
                    title="Open Visual SCADA Dashboard"
                  >
                    <Activity size={13} className="text-emerald-600" />
                    <span>SCADA Dashboard</span>
                  </button>
                );
              })()}
            </div>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">
              Real-time Register Values &amp; Alert Management
            </p>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="flex flex-wrap items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
              <Database size={12} /> Total Registers
            </span>
            <span className="font-mono text-lg font-bold text-gray-900 leading-none">
              {registers.length}
            </span>
          </div>

          <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
              <Bell size={12} className="text-emerald-600" /> Configured Rules
            </span>
            <span className="font-mono text-lg font-bold text-emerald-600 leading-none">
              {totalConfiguredAlerts}
            </span>
          </div>

          {totalActiveAlerts > 0 && (
            <>
              <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <AlertTriangle size={12} className="animate-pulse" /> Active Alerts
                </span>
                <span className="font-mono text-lg font-bold text-red-600 leading-none animate-pulse">
                  {totalActiveAlerts}
                </span>
              </div>
            </>
          )}

          <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
              <Clock size={12} /> Last Received
            </span>
            <span className="font-mono text-sm font-bold text-emerald-600 leading-none mt-0.5">
              {lastUpdate
                ? lastUpdate.toLocaleTimeString([], {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    fractionalSecondDigits: 3,
                  })
                : '--:--:--'}
            </span>
          </div>
        </div>
      </div>

      {/* Historical Data & Logging Configuration */}
      <div className="mb-6">
        <DeviceHistoryConfigCard deviceId={deviceId || ''} />
      </div>

      {/* Container 1 (Slave ID 1 - Block 1) */}
      <div className="mb-8">
        <div className="bg-white p-4 rounded-t-2xl flex justify-between items-center border border-gray-200 border-b-0">
          <div className="flex items-center gap-3 text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
              <Database size={18} />
            </div>
            <h2 className="font-bold tracking-wide text-sm uppercase">Slave ID: 1 (Block 1)</h2>
          </div>
        </div>
        <div className="bg-gray-50/50 border border-gray-200 rounded-b-2xl p-4 sm:p-6 shadow-inner">
          {group1.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 font-medium text-sm">No registers matching criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {group1.map((reg, idx) => renderRegisterCard(reg, idx))}
            </div>
          )}
        </div>
      </div>

      {/* Container 2 (Slave ID 1 - Block 2) */}
      <div className="mb-8">
        <div className="bg-white p-4 rounded-t-2xl flex justify-between items-center border border-gray-200 border-b-0">
          <div className="flex items-center gap-3 text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
              <Database size={18} />
            </div>
            <h2 className="font-bold tracking-wide text-sm uppercase">Slave ID: 1 (Block 2)</h2>
          </div>
        </div>
        <div className="bg-gray-50/50 border border-gray-200 rounded-b-2xl p-4 sm:p-6 shadow-inner">
          {group2.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 font-medium text-sm">No registers matching criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {group2.map((reg, idx) => renderRegisterCard(reg, idx))}
            </div>
          )}
        </div>
      </div>

      {/* Register Alert Modal */}
      <AnimatePresence>
        {selectedRegisterForAlert && (
          <RegisterAlertModal
            isOpen={Boolean(selectedRegisterForAlert)}
            onClose={() => setSelectedRegisterForAlert(null)}
            deviceId={deviceId || ''}
            registerNumber={selectedRegisterForAlert.registerNumber}
            registerName={selectedRegisterForAlert.registerName}
            currentValue={selectedRegisterForAlert.currentValue}
            existingConfig={selectedRegisterForAlert.existingConfig}
            onSaved={handleAlertConfigSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

