import React from 'react';
import { MotorCard } from '../ui/MotorCard';
import { useMqttStore } from '../../store/useMqttStore';

export const MotorMonitoring: React.FC = () => {
  const { parsedData } = useMqttStore();

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4">Motor Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MotorCard
          name="Motor 1"
          isOn={parsedData['2'] === 1}
          runtime={parsedData['46'] || 0}
          currentR={parsedData['11'] || 0}
          currentY={parsedData['12'] || 0}
          currentB={parsedData['13'] || 0}
        />
        <MotorCard
          name="Motor 2"
          isOn={parsedData['3'] === 1}
          runtime={parsedData['47'] || 0}
          currentR={parsedData['14'] || 0}
          currentY={parsedData['15'] || 0}
          currentB={parsedData['16'] || 0}
        />
        <MotorCard
          name="Motor 3"
          isOn={parsedData['4'] === 1}
          runtime={parsedData['48'] || 0}
          currentR={parsedData['17'] || 0}
          currentY={parsedData['18'] || 0}
          currentB={parsedData['19'] || 0}
        />
      </div>
    </div>
  );
};
