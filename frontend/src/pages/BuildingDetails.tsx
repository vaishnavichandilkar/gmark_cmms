import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { mockBuildings, mockDevices } from '../data/mock';
import { DeviceCard } from '../components/device/DeviceCard';

export function BuildingDetails() {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  
  const building = mockBuildings.find(b => b.id === buildingId);

  if (!building) {
    return (
      <div className="min-h-screen p-8 max-w-7xl mx-auto text-center">
        <h2 className="text-2xl text-textMain mb-4">Building not found</h2>
        <button onClick={() => navigate('/')} className="text-healthy hover:underline">
          Return to Overview
        </button>
      </div>
    );
  }

  // Instead of fetching from API (as per user instruction to not change fetch logic, we use mockDevices)
  const devices = mockDevices;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-textMuted hover:text-textMain transition-colors mb-8"
      >
        <ArrowLeft size={20} />
        <span>Back to Overview</span>
      </button>

      <h1 className="text-4xl font-bold text-textMain mb-8">{building.name} - Systems</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>
    </div>
  );
}
