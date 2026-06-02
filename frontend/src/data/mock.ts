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
