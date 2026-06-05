import type { Building } from '../types';

export const mockBuildings: Building[] = [
  {
    id: 'a',
    name: 'A Building',
    deviceCount: 2,
    onlineDevices: 2,
    offlineDevices: 0,
    activeFaults: 0,
    healthPercentage: 100,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'b',
    name: 'B Building',
    deviceCount: 13,
    onlineDevices: 11,
    offlineDevices: 2,
    activeFaults: 1,
    healthPercentage: 92,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'c',
    name: 'C Building',
    deviceCount: 45,
    onlineDevices: 40,
    offlineDevices: 5,
    activeFaults: 2,
    healthPercentage: 88,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'stp',
    name: 'STP',
    deviceCount: 8,
    onlineDevices: 8,
    offlineDevices: 0,
    activeFaults: 0,
    healthPercentage: 100,
    lastUpdated: new Date().toISOString(),
  }
];

export const facilityName = "Gera Imperium";

import type { Device } from '../types';

export const mockDevices: Device[] = [
  {
    id: 'd1',
    name: 'FLUSHING TERRACE BOOSTER SYSTEM',
    status: 'OFFLINE',
    latestData: {
      faults: 0,
      runningState: 'OFF',
      panelWorkMode: 'DOL',
      voltage: 413,
      current: 0.0,
      pressure: 0.10,
      timestamp: '2026-06-04 14:00:00'
    }
  },
  {
    id: 'd2',
    name: 'DOMESTIC TERRACE BOOSTER SYSTEM',
    status: 'ONLINE',
    latestData: {
      faults: 0,
      runningState: 'RUNNING',
      panelWorkMode: 'AUTO',
      voltage: 415,
      current: 4.8,
      pressure: 0.35,
      timestamp: '2026-06-04 14:05:00'
    }
  },
  {
    id: 'd3',
    name: 'SUMP PUMP-01',
    status: 'WARNING',
    latestData: {
      faults: 1,
      runningState: 'RUNNING',
      panelWorkMode: 'MANUAL',
      voltage: 410,
      current: 6.2,
      pressure: 0.20,
      timestamp: '2026-06-04 14:02:00'
    }
  },
  {
    id: 'd4',
    name: 'SUB SOIL PUMP-04',
    status: 'FAULT',
    latestData: {
      faults: 2,
      runningState: 'STOPPED',
      panelWorkMode: 'OFF',
      voltage: 0,
      current: 0.0,
      pressure: 0.0,
      timestamp: '2026-06-04 13:50:00'
    }
  }
];
