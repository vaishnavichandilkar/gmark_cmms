/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { io } from 'socket.io-client';
import { DeviceCard } from '../components/device/DeviceCard';
import type { Device } from '../types';

export function BuildingDetails() {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  
  const [buildingName, setBuildingName] = useState<string>('Loading Building...');
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    // 1. Fetch buildings to get current building name
    fetch('http://localhost:3000/buildings')
      .then(res => res.json())
      .then(data => {
        const b = data.find((x: any) => x.id.toString() === buildingId);
        if (b) setBuildingName(b.name);
        else setBuildingName('Building not found');
      })
      .catch(console.error);

    // 2. Fetch devices for this building
    fetch(`http://localhost:3000/buildings/${buildingId}/devices`)
      .then(res => res.json())
      .then(deviceList => {
        // Fetch dashboard data for each device
        Promise.all(deviceList.map((d: any) => 
          fetch(`http://localhost:3000/devices/${d.deviceId}/dashboard`)
            .then(res => res.json())
        )).then(dashboardData => {
          const mappedDevices: Device[] = dashboardData.map((data: any) => ({
            id: data.deviceId,
            name: data.name,
            status: data.status.toUpperCase(),
            latestData: {
              faults: data.latestData?.faults ?? 0,
              runningState: data.latestData?.runningState ?? 'OFF',
              panelWorkMode: data.latestData?.panelWorkMode ?? 'MANUAL',
              voltage: data.latestData?.voltage ?? 0,
              current: data.latestData?.current ?? 0,
              pressure: data.latestData?.pressure ?? 0,
              timestamp: data.latestData?.timestamp ?? data.lastSeen ?? new Date().toISOString()
            }
          }));
          setDevices(mappedDevices);
        });
      })
      .catch(console.error);

    // 3. Connect WebSocket for live updates
    const socket = io('http://localhost:3000');
    socket.on('device-update', (update: any) => {
      setDevices(prev => prev.map(d => {
        if (d.id === update.deviceId) {
          return {
            ...d,
            latestData: {
              ...d.latestData,
              ...update.registers, // assuming registers contains the key-values
              timestamp: new Date().toISOString()
            }
          };
        }
        return d;
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [buildingId]);

  if (buildingName === 'Building not found') {
    return (
      <div className="min-h-screen p-8 max-w-7xl mx-auto text-center">
        <h2 className="text-2xl text-textMain mb-4">Building not found</h2>
        <button onClick={() => navigate('/')} className="text-healthy hover:underline">
          Return to Overview
        </button>
      </div>
    );
  }


  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-textMuted hover:text-textMain transition-colors mb-8"
      >
        <ArrowLeft size={20} />
        <span>Back to Overview</span>
      </button>

      <h1 className="text-4xl font-bold text-textMain mb-8">{buildingName} - Systems</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>
    </div>
  );
}
