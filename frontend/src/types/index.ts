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
