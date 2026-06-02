import React from 'react';
import { GaugeCard } from '../ui/GaugeCard';
import { useMqttStore } from '../../store/useMqttStore';

export const RealTimeGauges: React.FC = () => {
  const { parsedData } = useMqttStore();

  const pressureBar = parsedData['28'] || 0;
  const avgVoltage = parsedData['7'] || 0;
  const currentM1 = parsedData['11'] || 0;
  // Assume some percentage logic for tank if it's 0-100, wait, it says underground tank 0/1. 
  // Let's show Pressure in mA instead if percentage isn't a gauge
  const pressureMA = parsedData['30'] || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <GaugeCard
        title="Pressure (Bar)"
        value={pressureBar}
        min={0}
        max={250}
        unit="Bar"
        color="#3b82f6" // Blue
      />
      <GaugeCard
        title="Avg Input Supply"
        value={avgVoltage}
        min={0}
        max={700}
        unit="V"
        color="#10b981" // Green
      />
      <GaugeCard
        title="M1 R Current"
        value={currentM1}
        min={0}
        max={250}
        unit="A"
        color="#f59e0b" // Orange
      />
      <GaugeCard
        title="Pressure (mA)"
        value={pressureMA}
        min={400}
        max={2000}
        unit="mA"
        color="#8b5cf6" // Purple
      />
    </div>
  );
};
