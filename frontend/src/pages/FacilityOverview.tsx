import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Building2, Box, Wifi, AlertTriangle } from 'lucide-react';
import { Header } from '../components/Header';
import { KpiCard } from '../components/KpiCard';
import { BuildingCard } from '../components/BuildingCard';
import { SearchBar } from '../components/SearchBar';
import { mockBuildings, facilityName } from '../data/mock';

export function FacilityOverview() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');

  const stats = useMemo(() => {
    return mockBuildings.reduce(
      (acc, b) => ({
        totalDevices: acc.totalDevices + b.deviceCount,
        onlineDevices: acc.onlineDevices + b.onlineDevices,
        activeFaults: acc.activeFaults + b.activeFaults,
      }),
      { totalDevices: 0, onlineDevices: 0, activeFaults: 0 }
    );
  }, []);

  const filteredBuildings = useMemo(() => {
    return mockBuildings.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
      
      let matchesFilter = true;
      if (filter === 'healthy') matchesFilter = b.healthPercentage === 100;
      if (filter === 'warning') matchesFilter = b.healthPercentage > 90 && b.healthPercentage < 100;
      if (filter === 'critical') matchesFilter = b.healthPercentage <= 90;

      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const percentageOnline = stats.totalDevices > 0 ? ((stats.onlineDevices / stats.totalDevices) * 100).toFixed(1) : '0';

  return (
    <div className="pb-12">
      <Header facilityName={facilityName} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard 
          title="Total Buildings" 
          value={mockBuildings.length} 
          icon={<Building2 size={28} strokeWidth={2.5} />} 
          colorScheme="blue"
          subtitle="All Buildings"
          subtitleColor="text-blue-500"
        />
        <KpiCard 
          title="Total Devices" 
          value={stats.totalDevices} 
          icon={<Box size={28} strokeWidth={2.5} />} 
          colorScheme="green"
          subtitle="Across All Buildings"
          subtitleColor="text-emerald-500"
        />
        <KpiCard 
          title="Online Devices" 
          value={stats.onlineDevices} 
          icon={<Wifi size={28} strokeWidth={2.5} />} 
          colorScheme="purple"
          subtitle={`${percentageOnline}% Online`}
          subtitleColor="text-emerald-500"
        />
        <KpiCard 
          title="Active Faults" 
          value={stats.activeFaults} 
          icon={<AlertTriangle size={28} strokeWidth={2.5} />} 
          colorScheme="red"
          subtitle={stats.activeFaults > 0 ? "Requires Attention" : "All Systems Normal"}
          subtitleColor={stats.activeFaults > 0 ? "text-red-500" : "text-gray-500"}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <SearchBar 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
        
        <div className="flex items-center gap-3">
          {(['all', 'healthy', 'warning', 'critical'] as const).map(f => {
            const colors = {
              all: 'bg-blue-600 text-white',
              healthy: 'bg-white text-gray-600',
              warning: 'bg-white text-gray-600',
              critical: 'bg-white text-gray-600'
            };
            const dots = {
              all: <div className="w-2 h-2 rounded-full bg-white mr-2" />,
              healthy: <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />,
              warning: <div className="w-2 h-2 rounded-full bg-amber-500 mr-2" />,
              critical: <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
            };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center px-5 py-2.5 rounded-full text-xs font-bold capitalize transition-all border ${
                  filter === f 
                    ? colors.all + ' border-blue-600 shadow-sm'
                    : colors[f] + ' border-gray-200 hover:bg-gray-50'
                }`}
              >
                {dots[f]}
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
      >
        {filteredBuildings.map(building => (
          <BuildingCard key={building.id} building={building} />
        ))}
        {filteredBuildings.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No buildings found matching your criteria.
          </div>
        )}
      </motion.div>
    </div>
  );
}
