import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  Radio, 
  Activity, 
  Droplet, 
  Cpu, 
  WifiOff 
} from 'lucide-react';
import { useMqttStore } from '../../store/useMqttStore';
import { detectFaults } from '../../utils/faultDetector';
import { initAudioContext, playAlarmSound, speakFaultAlert } from '../../services/VoiceAlertService';

export const FaultMonitoringPanel: React.FC = () => {
  const { parsedData, isVoiceMuted, isAudioInitialized, toggleVoiceMute, setAudioInitialized, simulateFaults } = useMqttStore();

  const { hasFault, activeFaults } = detectFaults(parsedData);

  // Define the grid of annunciator lights mapping to faults
  const annunciatorTiles = [
    {
      id: 'r_phase',
      label: 'R-PHASE FAULT',
      isActive: parsedData['6'] === 1,
      color: 'bg-red-600 border-red-500 text-red-100 shadow-red-900/50',
      icon: ShieldAlert,
    },
    {
      id: 'y_phase',
      label: 'Y-PHASE FAULT',
      isActive: parsedData['6'] === 2,
      color: 'bg-red-600 border-red-500 text-red-100 shadow-red-900/50',
      icon: ShieldAlert,
    },
    {
      id: 'b_phase',
      label: 'B-PHASE FAULT',
      isActive: parsedData['6'] === 3,
      color: 'bg-red-600 border-red-500 text-red-100 shadow-red-900/50',
      icon: ShieldAlert,
    },
    {
      id: 'phase_rev',
      label: 'PHASE REVERSE',
      isActive: parsedData['6'] === 4,
      color: 'bg-amber-600 border-amber-500 text-amber-100 shadow-amber-900/50',
      icon: Activity,
    },
    {
      id: 'no_power',
      label: 'NO POWER SUPPLY',
      isActive: parsedData['6'] === 5,
      color: 'bg-red-700 border-red-500 text-red-100 shadow-red-950/80',
      icon: ShieldAlert,
    },
    {
      id: 'pump1',
      label: 'PUMP 1 FAULT',
      isActive: parsedData['42'] !== undefined && parsedData['42'] > 0,
      color: 'bg-red-600 border-red-500 text-red-100 shadow-red-900/50',
      icon: Cpu,
    },
    {
      id: 'pump2',
      label: 'PUMP 2 FAULT',
      isActive: parsedData['43'] !== undefined && parsedData['43'] > 0,
      color: 'bg-red-600 border-red-500 text-red-100 shadow-red-900/50',
      icon: Cpu,
    },
    {
      id: 'pump3',
      label: 'PUMP 3 FAULT',
      isActive: parsedData['44'] !== undefined && parsedData['44'] > 0,
      color: 'bg-red-600 border-red-500 text-red-100 shadow-red-900/50',
      icon: Cpu,
    },
    {
      id: 'water_fail',
      label: 'WATER SUPPLY FAIL',
      isActive: parsedData['23'] === 0,
      color: 'bg-amber-600 border-amber-500 text-amber-100 shadow-amber-900/50',
      icon: Droplet,
    },
    {
      id: 'comm_fail',
      label: 'COMMUNICATION FAIL',
      isActive: parsedData['29'] === 0,
      color: 'bg-red-700 border-red-600 text-red-100 shadow-red-950/80',
      icon: WifiOff,
    },
  ];

  const handleEnableAudio = async () => {
    const success = await initAudioContext();
    if (success) {
      setAudioInitialized(true);
      speakFaultAlert('Voice alert system initialized. Monitoring live data.');
    }
  };

  const handleTestAudio = async () => {
    if (!isAudioInitialized) {
      await handleEnableAudio();
      setTimeout(() => {
        simulateFaults();
      }, 1500);
      return;
    }
    simulateFaults();
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-6 shadow-2xl mb-8 relative overflow-hidden">
      
      {/* SCADA Console Grid Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-3">
            <Radio className={`w-5 h-5 ${hasFault ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
            ALARM ANNUNCIATOR CONSOLE
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            System status monitoring • Web Audio & Speech alert engine
          </p>
        </div>

        {/* Control Center */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Authorization State Banner */}
          {!isAudioInitialized ? (
            <motion.button
              onClick={handleEnableAudio}
              animate={{ borderColor: ['rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 1)', 'rgba(239, 68, 68, 0.4)'] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="px-4 py-2 rounded-lg text-xs font-mono bg-red-950/30 text-red-400 border border-red-500/40 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-lg"
            >
              ⚠️ INITIALIZE AUDIO SYSTEM (CLICK TO ENABLE)
            </motion.button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-950/20 text-emerald-400 border border-emerald-500/20">
              🔊 AUDIO ENGINE ACTIVE
            </span>
          )}

          {/* Test System Button */}
          <button
            onClick={handleTestAudio}
            className="px-3.5 py-2 rounded-lg text-xs font-mono bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            TEST SYSTEM
          </button>

          {/* Mute System Button */}
          <button
            onClick={toggleVoiceMute}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono border flex items-center gap-2 transition-all cursor-pointer ${
              isVoiceMuted
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-400 hover:bg-amber-950/40'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isVoiceMuted ? (
              <>
                <VolumeX className="w-4 h-4" />
                MUTE: ON
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                MUTE: OFF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alarm Status Banner */}
      <div className="mb-6">
        {!hasFault ? (
          <div className="flex items-center gap-3 text-emerald-400 bg-emerald-950/10 px-4 py-3 rounded-lg border border-emerald-500/20 font-mono text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>SYSTEM HEALTHY: NO ACTIVE WARNINGS DETECTED</span>
          </div>
        ) : (
          <motion.div
            animate={{ 
              backgroundColor: ['rgba(153, 27, 27, 0.1)', 'rgba(153, 27, 27, 0.25)', 'rgba(153, 27, 27, 0.1)'],
              borderColor: ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 0.2)']
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="flex items-center gap-3 text-red-400 px-4 py-3 rounded-lg border font-mono text-sm"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
            <span>CRITICAL WARNING: {activeFaults.length} DIAGNOSTIC FAULTS DETECTED</span>
          </motion.div>
        )}
      </div>

      {/* Industrial Grid Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {annunciatorTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.id}
              className={`relative rounded border p-4 flex flex-col items-center justify-center gap-3 h-28 text-center transition-all ${
                tile.isActive
                  ? `${tile.color} border-t-4 shadow-lg`
                  : 'bg-slate-950/40 border-slate-800 text-slate-600'
              }`}
            >
              {tile.isActive ? (
                // Blinking Light Overlay
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="absolute inset-0 rounded opacity-15 bg-white pointer-events-none"
                />
              ) : null}

              <Icon className={`w-6 h-6 ${tile.isActive ? 'text-white' : 'text-slate-700'}`} />

              <span className={`text-xs font-mono font-bold tracking-wider leading-tight ${tile.isActive ? 'text-white' : 'text-slate-600'}`}>
                {tile.label}
              </span>

              {/* Hardware style indicators */}
              <div className="absolute top-2 right-2 flex gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${tile.isActive ? 'bg-white shadow' : 'bg-slate-800'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
