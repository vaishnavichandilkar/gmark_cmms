import { create } from 'zustand';
import { parseRegisterData } from '../utils/parsers';

export interface RegisterItem {
  register: string;
  value: number;
}

export interface MqttPayload {
  topic?: string;
  timestamp: number;
  registers: RegisterItem[];
}

interface ChartDataPoint {
  time: string;
  voltageRY: number;
  voltageYB: number;
  voltageRB: number;
  currentM1R: number;
  pressure: number;
}

interface MqttState {
  isConnected: boolean;
  lastUpdated: number | null;
  topic: string;
  rawRegisters: RegisterItem[];
  parsedData: Record<string, number>;
  historicalData: ChartDataPoint[];
  
  activeTab: string;
  isVoiceMuted: boolean;
  isAudioInitialized: boolean;
  setConnectionStatus: (status: boolean) => void;
  updateData: (payload: MqttPayload) => void;
  setTopic: (topic: string) => void;
  setActiveTab: (tab: string) => void;
  setAudioInitialized: (status: boolean) => void;
  toggleVoiceMute: () => void;
  simulateFaults: () => void;
}
export const useMqttStore = create<MqttState>((set) => ({
  activeTab: 'Overview',
  isConnected: false,
  lastUpdated: null,
  topic: 'AGC/SE-2026022303', // Default or updated dynamically
  rawRegisters: [],
  parsedData: {},
  historicalData: [],
  isVoiceMuted: false,
  isAudioInitialized: false,

  setConnectionStatus: (status) => set({ isConnected: status }),
  
  setTopic: (topic) => set({ topic }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),

  setAudioInitialized: (status) => set({ isAudioInitialized: status }),

  toggleVoiceMute: () => set((state) => ({ isVoiceMuted: !state.isVoiceMuted })),

  simulateFaults: () => set((state) => {
    const originalData = { ...state.parsedData };
    const simulatedData = {
      ...state.parsedData,
      '6': 1,  // R Phase Fault
      '23': 0, // Water Failure (Water supply unavailable)
    };
    
    setTimeout(() => {
      set({ parsedData: originalData });
    }, 8000);
    
    return { parsedData: simulatedData };
  }),

  updateData: (payload) => set((state) => {
    const parsed = parseRegisterData(payload.registers);
    
    // Create new historical data point
    const now = new Date(payload.timestamp);
    const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const newPoint: ChartDataPoint = {
      time: timeString,
      voltageRY: parsed['8'] || 0,
      voltageYB: parsed['9'] || 0,
      voltageRB: parsed['10'] || 0,
      currentM1R: parsed['11'] || 0,
      pressure: parsed['28'] || 0,
    };

    const newHistory = [...state.historicalData, newPoint].slice(-50); // Keep last 50

    return {
      lastUpdated: payload.timestamp,
      rawRegisters: payload.registers,
      parsedData: parsed,
      historicalData: newHistory,
      ...(payload.topic ? { topic: payload.topic } : {})
    };
  }),
}));
