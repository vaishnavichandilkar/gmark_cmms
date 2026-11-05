import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Building2, Building, Cpu } from 'lucide-react';
import { AddFacility } from '../master/AddFacility';
import { AddMachine } from './AddMachine';

export type AssetTypeChoice = 'facility' | 'subfacility' | 'machine';

export function CreateAssetPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const getInitialType = (): AssetTypeChoice => {
    const param = searchParams.get('type');
    if (param === 'facility' || param === 'subfacility' || param === 'machine') {
      return param;
    }
    const state = location.state as any;
    if (state?.isSubfacility || state?.type === 'subfacility') return 'subfacility';
    if (state?.type === 'machine') return 'machine';
    if (state?.type === 'facility') return 'facility';
    return 'facility';
  };

  const [activeType, setActiveType] = useState<AssetTypeChoice>(getInitialType);

  useEffect(() => {
    const param = searchParams.get('type');
    if (param === 'facility' || param === 'subfacility' || param === 'machine') {
      setActiveType(param);
    }
  }, [searchParams]);

  const handleSelectType = (type: AssetTypeChoice) => {
    setActiveType(type);
    setSearchParams({ type });
  };

  const renderTypeSelector = () => (
    <div 
      className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-2xs" 
      role="tablist"
      aria-label="Asset Type Selection"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeType === 'facility'}
        onClick={() => handleSelectType('facility')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          activeType === 'facility'
            ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200/60'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
        }`}
      >
        <Building2 className={`w-3.5 h-3.5 ${activeType === 'facility' ? 'text-emerald-600' : 'text-gray-400'}`} />
        <span>🏢 Facility</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeType === 'subfacility'}
        onClick={() => handleSelectType('subfacility')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          activeType === 'subfacility'
            ? 'bg-white text-teal-800 shadow-xs border border-teal-200/60'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
        }`}
      >
        <Building className={`w-3.5 h-3.5 ${activeType === 'subfacility' ? 'text-teal-600' : 'text-gray-400'}`} />
        <span>🏬 Subfacility</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeType === 'machine'}
        onClick={() => handleSelectType('machine')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          activeType === 'machine'
            ? 'bg-white text-orange-800 shadow-xs border border-orange-200/60'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
        }`}
      >
        <Cpu className={`w-3.5 h-3.5 ${activeType === 'machine' ? 'text-orange-600' : 'text-gray-400'}`} />
        <span>⚙️ Machine</span>
      </button>
    </div>
  );

  return (
    <div className="w-full">
      {activeType === 'facility' && (
        <AddFacility 
          key="facility" 
          initialIsSubfacility={false} 
          typeSelector={renderTypeSelector()} 
        />
      )}

      {activeType === 'subfacility' && (
        <AddFacility 
          key="subfacility" 
          initialIsSubfacility={true} 
          typeSelector={renderTypeSelector()} 
        />
      )}

      {activeType === 'machine' && (
        <AddMachine 
          key="machine" 
          typeSelector={renderTypeSelector()} 
        />
      )}
    </div>
  );
}
