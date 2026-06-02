import React from 'react';
import { Power, Droplets, Network, Database } from 'lucide-react';
import { useMqttStore } from '../../store/useMqttStore';
import { StatusCard } from '../ui/StatusCard';

export const LiveStatusGrid: React.FC = () => {
  const { parsedData } = useMqttStore();

  const isDeviceActive = parsedData['1'] === 1;
  const isWaterAvailable = parsedData['23'] === 1;
  const isTransmissionOk = parsedData['29'] === 1;
  const isTankFull = parsedData['35'] === 1; // Assuming 1 means full

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatusCard
        title="Device Status"
        value={isDeviceActive ? 'ACTIVE' : 'INACTIVE'}
        icon={Power}
        status={isDeviceActive ? 'healthy' : 'error'}
      />
      <StatusCard
        title="Inlet Water"
        value={isWaterAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
        icon={Droplets}
        status={isWaterAvailable ? 'healthy' : 'warning'}
      />
      <StatusCard
        title="Transmission"
        value={isTransmissionOk ? 'CONNECTED' : 'DISCONNECTED'}
        icon={Network}
        status={isTransmissionOk ? 'healthy' : 'error'}
      />
      <StatusCard
        title="Underground Tank"
        value={isTankFull ? 'FULL' : 'EMPTY'}
        icon={Database}
        status={isTankFull ? 'healthy' : 'warning'}
      />
    </div>
  );
};
