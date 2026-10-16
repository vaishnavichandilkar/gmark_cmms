import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Plus } from 'lucide-react';
import { api } from '../../lib/api';

export interface LocationItem {
  id: number;
  location: string;
  facilityName: string;
  code: string;
}

interface SelectLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (item: LocationItem) => void;
}

export const SelectLocationPickerModal: React.FC<SelectLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [locationsList, setLocationsList] = useState<LocationItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.get('/facilities')
        .then(res => {
          const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
          const mapped: LocationItem[] = data.map((f: any, idx: number) => ({
            id: Number(f.id) || idx + 1,
            location: f.facilityName || 'Location',
            facilityName: f.mainFacility?.mainFacilityName || f.facilityName || 'Facility',
            code: f.facilityCode || `FAC${f.id}`,
          }));
          setLocationsList(mapped);
        })
        .catch(err => console.error('Failed to load facilities in picker:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = locationsList.filter(
    (item) =>
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-2xl space-y-4 border border-gray-100"
        >
          {/* Header Bar matching Screenshot 8 */}
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-emerald-800 hover:text-emerald-900 transition-colors p-1 rounded-full hover:bg-emerald-50 cursor-pointer"
              >
                <ArrowLeft size={22} strokeWidth={2.5} />
              </button>
              <h2 className="text-xl font-bold text-emerald-950 tracking-tight">
                Locations
              </h2>
            </div>

            {/* Toolbar: Search input & + Add button */}
            <div className="flex items-center gap-2">
              <div className="relative w-36 sm:w-48">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-gray-100 border border-gray-200 rounded-2xl pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                />
                <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sky-600 stroke-[2.5]" />
              </div>

              <button
                type="button"
                className="flex items-center gap-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-3 py-1.5 rounded-2xl text-xs transition-all cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} className="text-sky-600" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Locations Table matching Screenshot 8 */}
          <div className="overflow-x-auto border border-gray-200 rounded-2xl max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-200/80 text-gray-700 font-bold uppercase border-b border-gray-200 sticky top-0">
                  <th className="p-3 w-8 text-center"></th>
                  <th className="p-3 text-center">No.</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Facility Name</th>
                  <th className="p-3">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                      No locations found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, index) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id);
                        onSelectLocation(item);
                        onClose();
                      }}
                      className={`hover:bg-emerald-50/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-sky-500 bg-sky-500' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </td>
                      <td className="p-3 text-center font-medium">{index + 1}</td>
                      <td className="p-3 font-semibold text-gray-800">{item.location}</td>
                      <td className="p-3 text-gray-700">{item.facilityName}</td>
                      <td className="p-3 font-mono text-gray-500">{item.code}</td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
