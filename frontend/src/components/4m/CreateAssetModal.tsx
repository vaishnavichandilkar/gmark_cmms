import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, HelpCircle } from 'lucide-react';

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectFacility = () => {
    onClose();
    navigate('/master/facility/new', { state: { returnUrl: '/assets', isSubfacility: false } });
  };

  const handleSelectSubfacility = () => {
    onClose();
    navigate('/master/subfacility/new', { state: { returnUrl: '/assets', isSubfacility: true } });
  };

  const handleSelectMachine = () => {
    onClose();
    navigate('/machine-management/new', { state: { returnUrl: '/assets' } });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="modal-title" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            CREATE NEW ASSET
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-1 rounded-md hover:bg-gray-100"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Modal Cards: ONLY Facility, Sub Facility, Machine */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Card 1: Facility */}
          <button
            type="button"
            onClick={handleSelectFacility}
            className="group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-xs hover:shadow-md hover:border-emerald-500 hover:bg-emerald-50/20 transition-all text-left cursor-pointer"
          >
            <div className="w-20 h-20 shrink-0 flex items-center justify-center p-2 bg-slate-50 border border-slate-100 rounded-lg group-hover:bg-emerald-50/60 group-hover:border-emerald-200 transition-all">
              {/* Isometric Factory Graphic */}
              <svg 
                viewBox="0 0 68 68" 
                className="!w-14 !h-14 shrink-0" 
                style={{ width: '56px', height: '56px', minWidth: '56px', minHeight: '56px' }}
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Smokestacks */}
                <rect x="22" y="6" width="5" height="18" fill="#D32F2F" rx="1.5" />
                <rect x="23" y="6" width="3" height="4" fill="#B71C1C" />
                <rect x="32" y="10" width="5" height="14" fill="#D32F2F" rx="1.5" />
                <rect x="33" y="10" width="3" height="4" fill="#B71C1C" />
                <rect x="42" y="4" width="5" height="20" fill="#D32F2F" rx="1.5" />
                <rect x="43" y="4" width="3" height="4" fill="#B71C1C" />
                
                {/* Left Face */}
                <polygon points="6,34 34,18 34,58 6,48" fill="#C62828" />
                {/* Right Face */}
                <polygon points="34,18 62,32 62,54 34,58" fill="#E53935" />
                
                {/* Sawtooth Roof Left */}
                <polygon points="10,30 22,23 22,28 10,35" fill="#8E0000" />
                <polygon points="22,23 34,16 34,22 22,28" fill="#8E0000" />
                
                {/* Roof Flat Top Highlight */}
                <polygon points="6,34 34,18 62,32 34,46" fill="#FFFFFF" fillOpacity="0.25" />
                
                {/* Windows Grid */}
                <rect x="38" y="34" width="8" height="6" rx="1" fill="#FFF9C4" />
                <rect x="50" y="39" width="8" height="6" rx="1" fill="#FFF9C4" />
                <rect x="38" y="44" width="8" height="6" rx="1" fill="#FFF9C4" />
                <rect x="50" y="48" width="8" height="4" rx="1" fill="#FFF9C4" />
                
                {/* Left Face Windows */}
                <polygon points="12,38 20,34 20,40 12,44" fill="#FFE082" />
                <polygon points="24,32 30,29 30,35 24,38" fill="#FFE082" />
                <polygon points="12,45 20,41 20,47 12,50" fill="#FFE082" />
                
                {/* Base Ground Shadow */}
                <ellipse cx="34" cy="60" rx="30" ry="5" fill="#000000" fillOpacity="0.12" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                Facility
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Create top-level facility
              </div>
            </div>
          </button>

          {/* Card 2: Sub Facility */}
          <button
            type="button"
            onClick={handleSelectSubfacility}
            className="group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-xs hover:shadow-md hover:border-emerald-500 hover:bg-emerald-50/20 transition-all text-left cursor-pointer"
          >
            <div className="w-20 h-20 shrink-0 flex items-center justify-center p-2 bg-slate-50 border border-slate-100 rounded-lg group-hover:bg-emerald-50/60 group-hover:border-emerald-200 transition-all">
              {/* Subfacility Building Graphic */}
              <svg 
                viewBox="0 0 68 68" 
                className="!w-14 !h-14 shrink-0" 
                style={{ width: '56px', height: '56px', minWidth: '56px', minHeight: '56px' }}
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Secondary Wing */}
                <rect x="44" y="24" width="16" height="34" rx="2" fill="#0288D1" />
                <polygon points="44,24 60,18 60,24" fill="#01579B" />
                <rect x="48" y="28" width="8" height="4" rx="1" fill="#E1F5FE" />
                <rect x="48" y="36" width="8" height="4" rx="1" fill="#E1F5FE" />
                <rect x="48" y="44" width="8" height="4" rx="1" fill="#E1F5FE" />
                
                {/* Main Building Body */}
                <rect x="12" y="14" width="34" height="44" rx="3" fill="#03A9F4" />
                <polygon points="12,14 29,4 46,14" fill="#0288D1" />
                <rect x="12" y="14" width="34" height="3" fill="#B3E5FC" />
                
                {/* Windows 3x4 Grid */}
                <rect x="17" y="20" width="6" height="6" rx="1" fill="#FFFFFF" />
                <rect x="26" y="20" width="6" height="6" rx="1" fill="#FFFFFF" />
                <rect x="35" y="20" width="6" height="6" rx="1" fill="#FFFFFF" />
                
                <rect x="17" y="29" width="6" height="6" rx="1" fill="#FFF59D" />
                <rect x="26" y="29" width="6" height="6" rx="1" fill="#FFFFFF" />
                <rect x="35" y="29" width="6" height="6" rx="1" fill="#FFFFFF" />
                
                <rect x="17" y="38" width="6" height="6" rx="1" fill="#FFFFFF" />
                <rect x="26" y="38" width="6" height="6" rx="1" fill="#FFF59D" />
                <rect x="35" y="38" width="6" height="6" rx="1" fill="#FFFFFF" />
                
                {/* Entrance Canopy & Door */}
                <rect x="23" y="47" width="12" height="11" rx="1" fill="#01579B" />
                <rect x="26" y="49" width="3" height="9" fill="#81D4FA" />
                <rect x="30" y="49" width="3" height="9" fill="#81D4FA" />
                <rect x="21" y="46" width="16" height="2" fill="#E0E0E0" rx="0.5" />
                
                {/* Base Shadow */}
                <ellipse cx="34" cy="60" rx="28" ry="4" fill="#000000" fillOpacity="0.12" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                Sub Facility
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Under an existing parent facility
              </div>
            </div>
          </button>

          {/* Card 3: Machine */}
          <button
            type="button"
            onClick={handleSelectMachine}
            className="group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-xs hover:shadow-md hover:border-emerald-500 hover:bg-emerald-50/20 transition-all text-left cursor-pointer"
          >
            <div className="w-20 h-20 shrink-0 flex items-center justify-center p-2 bg-slate-50 border border-slate-100 rounded-lg group-hover:bg-emerald-50/60 group-hover:border-emerald-200 transition-all">
              {/* Forklift Graphic */}
              <svg 
                viewBox="0 0 68 68" 
                className="!w-14 !h-14 shrink-0" 
                style={{ width: '56px', height: '56px', minWidth: '56px', minHeight: '56px' }}
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Mast & Fork */}
                <rect x="50" y="10" width="4" height="42" fill="#37474F" rx="1" />
                <rect x="55" y="10" width="3" height="42" fill="#78909C" rx="1" />
                <polygon points="48,46 66,46 66,50 48,50" fill="#263238" />
                
                {/* Forklift Body */}
                <rect x="14" y="30" width="36" height="20" rx="4" fill="#FFB300" />
                <rect x="14" y="32" width="36" height="4" fill="#FFA000" />
                
                {/* Operator Cabin / Cage */}
                <polygon points="22,12 42,12 40,30 20,30" fill="#FF8F00" />
                <polygon points="25,15 39,15 37,28 23,28" fill="#ECEFF1" />
                <rect x="18" y="12" width="4" height="18" fill="#263238" />
                <rect x="39" y="12" width="4" height="18" fill="#263238" />
                <rect x="16" y="10" width="28" height="4" fill="#263238" rx="1.5" />
                
                {/* Steering */}
                <rect x="26" y="22" width="5" height="7" rx="1" fill="#37474F" />
                
                {/* Wheels */}
                <circle cx="22" cy="52" r="9" fill="#212121" />
                <circle cx="22" cy="52" r="5" fill="#757575" />
                <circle cx="22" cy="52" r="2" fill="#E0E0E0" />
                
                <circle cx="44" cy="52" r="9" fill="#212121" />
                <circle cx="44" cy="52" r="5" fill="#757575" />
                <circle cx="44" cy="52" r="2" fill="#E0E0E0" />
                
                {/* Base Shadow */}
                <ellipse cx="34" cy="62" rx="28" ry="4" fill="#000000" fillOpacity="0.12" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                Machine
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Register machine / asset
              </div>
            </div>
          </button>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50/80 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              window.open('https://help.fiixsoftware.com', '_blank');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-md shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
            <span>Show Video Help</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-300 rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
