import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ArrowRight, MapPin, Search } from 'lucide-react';
import { api } from '../../../lib/api';
import { CardSkeleton } from '../../../components/shared/ui/CardSkeleton';
import buildingA from '../../../assets/building/building A.png';
import buildingC from '../../../assets/building/building  C.png';

const buildingImages = [buildingA, buildingC];

interface Society {
  id: number;
  name: string;
  city: string;
}

export function SocietiesPage() {
  const navigate = useNavigate();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchSocieties = async () => {
      try {
        const response = await api.get('/societies');
        const data = response.data;
        if (Array.isArray(data)) {
          setSocieties(data);
        }
      } catch (err) {
        console.error('Failed to fetch societies:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSocieties();
  }, [navigate]);

  const filteredSocieties = societies.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen bg-gray-50/30 -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 pb-12 text-gray-900 relative">
      {/* Background highlight */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 to-transparent pointer-events-none" />

      {/* Header section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2 uppercase">
            Societies Directory
          </h1>
          <p className="text-sm font-semibold text-gray-500">
            Select a society facility to inspect active pumps, buildings, and monitoring systems.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search societies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-full pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#00a651] focus:ring-1 focus:ring-[#00a651] transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredSocieties.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center text-gray-500 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
          <Building2 size={48} className="text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">No societies found</h3>
          <p className="text-sm text-gray-500">Add a society in the Admin Page or check your search query.</p>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {filteredSocieties.map((soc, idx) => {
            const buildingImg = buildingImages[idx % buildingImages.length];
            return (
              <motion.div
                key={soc.id}
                onClick={() => navigate(`/society/${soc.id}`)}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="group cursor-pointer bg-white border border-gray-200 hover:border-[#00a651]/40 shadow-sm hover:shadow-md p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between"
              >
                {/* Card top gradient line on hover */}
                <div className="absolute top-0 inset-x-0 h-[3px] bg-[#00a651] opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Building Watermark Background Graphic */}
                <div className="absolute inset-0 w-full h-full opacity-[0.03] group-hover:opacity-[0.06] transition-all duration-300 pointer-events-none transform scale-100 group-hover:scale-[1.03] flex items-center justify-center p-4">
                  <img 
                    src={buildingImg} 
                    alt="Building Graphic" 
                    className="w-full h-full object-contain filter invert opacity-50" 
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-6">
                    {/* Icon badge */}
                    <div className="w-12 h-12 bg-gray-50 border border-gray-100 group-hover:border-[#00a651]/20 group-hover:bg-[#00a651]/5 text-gray-400 group-hover:text-[#00a651] rounded-2xl flex items-center justify-center transition-all relative z-10">
                      <Building2 size={22} />
                    </div>
                    
                    {/* Detail Link Indicator */}
                    <div className="p-2 rounded-full bg-gray-100 text-gray-400 group-hover:bg-[#00a651] group-hover:text-white transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 relative z-10">
                      <ArrowRight size={14} />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#00a651] transition-colors uppercase leading-snug relative z-10">
                    {soc.name}
                  </h3>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500 font-medium select-none relative z-10">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="capitalize">{soc.city}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
