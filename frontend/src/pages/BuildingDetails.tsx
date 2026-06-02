import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { mockBuildings } from '../data/mock';

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

  // Placeholder for systems
  const systems = [
    'Domestic Booster System',
    'Flushing Booster System',
    'Sump Pumps',
    'Sub Soil Pumps'
  ];

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {systems.map((sys, i) => (
          <div key={i} className="glass-card p-6 flex justify-between items-center hover:border-black/10 cursor-pointer transition-colors">
            <h3 className="text-xl font-semibold text-textMain">{sys}</h3>
            <div className="h-3 w-3 rounded-full bg-healthy shadow-glow-healthy" />
          </div>
        ))}
      </div>
    </div>
  );
}
