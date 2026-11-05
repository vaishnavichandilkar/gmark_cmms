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

  const handleSelectTools = () => {
    onClose();
    navigate('/spares', { state: { returnUrl: '/assets' } });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150"
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

        {/* Modal Cards Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Locations or Facilities */}
          <button
            type="button"
            onClick={handleSelectFacility}
            className="group flex items-center gap-4 p-4 bg-white border border-gray-200/90 rounded-md shadow-xs hover:shadow-md hover:border-emerald-500 hover:bg-emerald-50/20 transition-all text-left cursor-pointer"
          >
            <div className="w-16 h-16 shrink-0 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
              {/* Isometric Factory Graphic */}
              <svg viewBox="0 0 72 72" className="w-full h-full drop-shadow-sm" fill="none">
                {/* Smokestacks */}
                <rect x="22" y="10" width="4" height="14" fill="#d9534f" rx="1" />
                <rect x="30" y="14" width="4" height="10" fill="#d9534f" rx="1" />
                <rect x="38" y="8" width="4" height="16" fill="#d9534f" rx="1" />
                {/* Main Building Left Face */}
                <polygon points="12,38 38,24 38,58 12,50" fill="#c0392b" />
                {/* Main Building Right Face */}
                <polygon points="38,24 62,36 62,54 38,58" fill="#e74c3c" />
                {/* Sawtooth Roof Left */}
                <polygon points="16,33 26,27 26,30 16,36" fill="#962d22" />
                <polygon points="26,27 36,21 36,26 26,30" fill="#962d22" />
                {/* Roof Top */}
                <polygon points="12,38 38,24 62,36 36,50" fill="#7f8c8d" opacity="0.3" />
                {/* Windows on side */}
                <polygon points="42,38 48,41 48,46 42,43" fill="#ecf0f1" />
                <polygon points="52,43 58,46 58,51 52,48" fill="#ecf0f1" />
                <polygon points="18,42 24,39 24,44 18,47" fill="#f1c40f" opacity="0.8" />
                <polygon points="28,37 34,34 34,39 28,42" fill="#f1c40f" opacity="0.8" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-gray-800 text-[14px] leading-snug group-hover:text-emerald-700 transition-colors">
                Locations<br />
                <span className="font-semibold text-gray-600 group-hover:text-emerald-600">or Facilities</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Create top-level facility</div>
            </div>
          </button>

          {/* Card 2: Equipment or Machines */}
          <button
            type="button"
            onClick={handleSelectMachine}
            className="group flex items-center gap-4 p-4 bg-white border border-gray-200/90 rounded-md shadow-xs hover:shadow-md hover:border-emerald-500 hover:bg-emerald-50/20 transition-all text-left cursor-pointer"
          >
            <div className="w-16 h-16 shrink-0 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
              {/* Forklift Graphic */}
              <svg viewBox="0 0 72 72" className="w-full h-full drop-shadow-sm" fill="none">
                {/* Mast and Fork */}
                <rect x="54" y="16" width="3" height="34" fill="#34495e" />
                <rect x="58" y="16" width="3" height="34" fill="#7f8c8d" />
                <polygon points="52,46 68,46 68,49 52,49" fill="#2c3e50" />
                {/* Forklift Body */}
                <rect x="18" y="32" width="34" height="18" rx="3" fill="#f39c12" />
                {/* Cabin Roof & Pillars */}
                <polygon points="26,18 44,18 42,32 24,32" fill="#e67e22" />
                <polygon points="28,20 42,20 40,30 26,30" fill="#ecf0f1" />
                <rect x="23" y="18" width="3" height="15" fill="#34495e" />
                <rect x="43" y="18" width="3" height="15" fill="#34495e" />
                <rect x="21" y="16" width="27" height="3" fill="#34495e" rx="1" />
                {/* Wheels */}
                <circle cx="26" cy="52" r="7" fill="#2c3e50" />
                <circle cx="26" cy="52" r="3.5" fill="#95a5a6" />
                <circle cx="48" cy="52" r="7" fill="#2c3e50" />
                <circle cx="48" cy="52" r="3.5" fill="#95a5a6" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-gray-800 text-[14px] leading-snug group-hover:text-emerald-700 transition-colors">
                Equipment<br />
                <span className="font-semibold text-gray-600 group-hover:text-emerald-600">or Machines</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Register machine / asset</div>
            </div>
          </button>

          {/* Card 3: Subfacilities */}
          <button
            type="button"
            onClick={handleSelectSubfacility}
            className="group flex items-center gap-4 p-4 bg-white border border-gray-200/90 rounded-md shadow-xs hover:shadow-md hover:border-emerald-500 hover:bg-emerald-50/20 transition-all text-left cursor-pointer"
          >
            <div className="w-16 h-16 shrink-0 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
              {/* Subfacility Building Graphic */}
              <svg viewBox="0 0 72 72" className="w-full h-full drop-shadow-sm" fill="none">
                {/* Main Building Body */}
                <rect x="18" y="20" width="36" height="38" rx="2" fill="#3498db" />
                <polygon points="18,20 36,10 54,20" fill="#2980b9" />
                {/* Floors / Windows Grid */}
                <rect x="23" y="24" width="6" height="6" rx="1" fill="#ecf0f1" />
                <rect x="33" y="24" width="6" height="6" rx="1" fill="#ecf0f1" />
                <rect x="43" y="24" width="6" height="6" rx="1" fill="#ecf0f1" />
                <rect x="23" y="34" width="6" height="6" rx="1" fill="#ecf0f1" />
                <rect x="33" y="34" width="6" height="6" rx="1" fill="#f1c40f" />
                <rect x="43" y="34" width="6" height="6" rx="1" fill="#ecf0f1" />
                <rect x="23" y="44" width="6" height="6" rx="1" fill="#ecf0f1" />
                {/* Entrance Door */}
                <rect x="33" y="46" width="6" height="12" rx="1" fill="#1b4f72" />
                <rect x="43" y="44" width="6" height="6" rx="1" fill="#ecf0f1" />
                {/* Connected side wing */}
                <rect x="52" y="32" width="10" height="26" fill="#1f618d" rx="1" />
                <rect x="55" y="36" width="4" height="4" fill="#ecf0f1" />
                <rect x="55" y="44" width="4" height="4" fill="#ecf0f1" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-gray-800 text-[14px] leading-snug group-hover:text-emerald-700 transition-colors">
                Subfacilities<br />
                <span className="font-semibold text-gray-600 group-hover:text-emerald-600">(Child Locations)</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Under an existing facility</div>
            </div>
          </button>

          {/* Card 4: Tools or Spares */}
          <button
            type="button"
            onClick={handleSelectTools}
            className="group flex items-center gap-4 p-4 bg-white border border-gray-200/90 rounded-md shadow-xs hover:shadow-md hover:border-emerald-500 hover:bg-emerald-50/20 transition-all text-left cursor-pointer"
          >
            <div className="w-16 h-16 shrink-0 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
              {/* Tools Wrench & Screwdriver Graphic */}
              <svg viewBox="0 0 72 72" className="w-full h-full drop-shadow-sm" fill="none">
                {/* Crossed Screwdriver */}
                <g transform="rotate(45 36 36)">
                  <rect x="34" y="12" width="4" height="24" fill="#95a5a6" />
                  <polygon points="32,12 40,12 36,8" fill="#7f8c8d" />
                  <rect x="32" y="36" width="8" height="22" rx="2" fill="#e74c3c" />
                  <rect x="34" y="38" width="4" height="18" fill="#c0392b" />
                </g>
                {/* Crossed Wrench */}
                <g transform="rotate(-45 36 36)">
                  <rect x="34" y="16" width="5" height="36" fill="#bdc3c7" rx="1" />
                  {/* Wrench Top Open Head */}
                  <path d="M30 18 C30 12 43 12 43 18 L39 22 L34 22 Z" fill="#7f8c8d" />
                  {/* Wrench Bottom Ring */}
                  <circle cx="36.5" cy="53" r="5" fill="#7f8c8d" />
                  <circle cx="36.5" cy="53" r="2.5" fill="white" />
                </g>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-gray-800 text-[14px] leading-snug group-hover:text-emerald-700 transition-colors">
                Tools<br />
                <span className="font-semibold text-gray-600 group-hover:text-emerald-600">& Spares</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Tools and spare parts</div>
            </div>
          </button>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50/80 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              // Informative help tip
              window.open('https://help.fiixsoftware.com', '_blank');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-md shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
            <span>Show Help</span>
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
