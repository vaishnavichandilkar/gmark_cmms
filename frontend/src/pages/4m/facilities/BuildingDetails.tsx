/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft } from 'lucide-react';
import { io } from 'socket.io-client';
import { DeviceCard } from '../../../components/scada/device/DeviceCard';
import type { Device } from '../../../types';
import { api } from '../../../lib/api';
import type { RootState } from '../../../store';

export function BuildingDetails() {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { user, buildingIds } = useSelector((state: RootState) => state.auth);

  const [buildingName, setBuildingName] = useState<string>('Loading Building...');
  const [buildingDetails, setBuildingDetails] = useState<any>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [topics, setTopics] = useState<string[]>([]);

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'SOCIETY_ADMIN') {
      const numericId = Number(buildingId);
      if (!buildingIds?.includes(numericId)) {
        navigate('/', { replace: true });
      }
    }
  }, [user, buildingIds, buildingId, navigate]);

  useEffect(() => {
    // 1. Fetch buildings to get current building name
    api.get('/buildings')
      .then(res => {
        const data = res.data;
        const b = data.find((x: any) => x.id.toString() === buildingId);
        if (b) {
          setBuildingName(b.name);
          setBuildingDetails(b);
        } else {
          const localBuildingsStr = localStorage.getItem('local_buildings');
          const localBuildings = localBuildingsStr ? JSON.parse(localBuildingsStr) : [];
          const lb = localBuildings.find((x: any) => x.id === buildingId);
          if (lb) {
            setBuildingName(lb.name);
            setBuildingDetails(lb);
          } else {
            setBuildingName('Building not found');
          }
        }
      })
      .catch(err => {
        console.error(err);
        const localBuildingsStr = localStorage.getItem('local_buildings');
        const localBuildings = localBuildingsStr ? JSON.parse(localBuildingsStr) : [];
        const lb = localBuildings.find((x: any) => x.id === buildingId);
        if (lb) {
          setBuildingName(lb.name);
          setBuildingDetails(lb);
        } else {
          setBuildingName('Building not found');
        }
      });

    // 2. Fetch devices for this building
    api.get(`/buildings/${buildingId}/devices`)
      .then(res => {
        const deviceList = res.data;
        // Fetch dashboard data for each device
        Promise.all(deviceList.map((d: any) =>
          api.get(`/devices/${d.deviceId}/dashboard`)
            .then(resDashboard => resDashboard.data)
        )).then(dashboardData => {
          const mappedDevices: Device[] = dashboardData
            .filter((data: any) => !data.error && data.deviceId)
            .map((data: any) => ({
              id: data.deviceId,
              name: data.system || data.name || 'Unknown Device',
              status: data.status ? data.status.toUpperCase() : 'UNKNOWN',
              latestData: {
                faults: data.faultCount ?? 0,
                runningState: (data.motor1Status || data.motor2Status) ? 'RUNNING' : data.status === 'online' ? 'ON' : 'OFF',
                panelWorkMode: 'AUTO',
                voltage: data.averageVoltage ?? 0,
                current: (data.motor1RCurrent || 0) + (data.motor2RCurrent || 0),
                pressure: data.pressureBar ?? 0,
                timestamp: data.lastSeen ?? new Date().toISOString()
              }
            }));
          setDevices(mappedDevices);

          const fetchedTopics = dashboardData
            .filter((d: any) => !d.error && d.topic)
            .map((d: any) => d.topic);
          setTopics(fetchedTopics);
        });
      })
      .catch(console.error);
  }, [buildingId, user]);

  useEffect(() => {
    // Connect WebSocket for live updates with JWT Auth token
    const token = localStorage.getItem('token');
    const socket = io('http://localhost:3001', {
      auth: { token },
    });

    socket.on('connect', () => {
      topics.forEach(topic => {
        socket.emit('join-device', { topic });
      });
    });

    socket.on('device-update', (update: any) => {
      const data = update.registers || {};
      setDevices(prev => prev.map(d => {
        if (d.id === update.deviceId) {
          return {
            ...d,
            latestData: {
              ...d.latestData,
              faults: data.pump1FaultType || data.pump2FaultType || data.inputPowerFaultType ? 1 : 0,
              runningState: (data.motor1Status || data.motor2Status) ? 'RUNNING' : 'ON',
              voltage: data.averageVoltage ?? d.latestData.voltage,
              current: (data.motor1RCurrent || 0) + (data.motor2RCurrent || 0),
              pressure: data.pressureBar ?? d.latestData.pressure,
              timestamp: new Date().toISOString()
            }
          };
        }
        return d;
      }));
    });

    return () => {
      topics.forEach(topic => {
        socket.emit('leave-device', { topic });
      });
      socket.disconnect();
    };
  }, [topics]);

  if (buildingName === 'Building not found') {
    return (
      <div className="min-h-screen p-8 max-w-7xl mx-auto text-center">
        <h2 className="text-2xl text-textMain mb-4">Building not found</h2>
        <button onClick={() => navigate(buildingDetails?.societyId ? `/society/${buildingDetails.societyId}` : '/')} className="text-healthy hover:underline">
          Return to Overview
        </button>
      </div>
    );
  }


  return (
    <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen bg-black -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 text-white relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-8 gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate(buildingDetails?.societyId ? `/society/${buildingDetails.societyId}` : '/')}
            className="w-11 h-11 liquid-glass rounded-full text-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-4 px-6 py-2.5 liquid-glass rounded-[24px] flex-1 sm:flex-initial">
            <h1 className="text-lg md:text-xl font-bold text-white tracking-wider uppercase truncate max-w-[200px] md:max-w-none">
              {buildingName} - Systems
            </h1>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-16">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} buildingName={buildingName} />
        ))}
      </div>
    </div>
  );
}
