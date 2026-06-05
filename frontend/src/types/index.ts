export interface Facility {
  id: string;
  name: string;
  buildings: Building[];
}

export interface Building {
  id: string;
  name: string;
  deviceCount: number;
  onlineDevices: number;
  offlineDevices: number;
  activeFaults: number;
  healthPercentage: number;
  lastUpdated: string;
}

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'RUNNING' | 'WARNING' | 'FAULT';
export type RunningState = 'ON' | 'OFF' | 'RUNNING' | 'STOPPED';
export type PanelWorkMode = 'AUTO' | 'MANUAL' | 'DOL' | 'OFF';

export interface DeviceLatestData {
  faults: number;
  runningState: RunningState;
  panelWorkMode: PanelWorkMode;
  voltage: number;
  current: number;
  pressure: number;
  timestamp: string;
}

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  latestData: DeviceLatestData;
}
