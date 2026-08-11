/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Building2, Box, Wifi, AlertTriangle } from 'lucide-react';
import { Header } from '../../../components/shared/Header';
import { KpiCard } from '../../../components/shared/KpiCard';
import { BuildingCard } from '../../../components/4m/BuildingCard';
import { SearchBar } from '../../../components/shared/SearchBar';
import type { Building } from '../../../types';
import { api } from '../../../lib/api';
import type { RootState } from '../../../store';

export function FacilityOverview() {
  const { societyId } = useParams<{ societyId: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [societyName, setSocietyName] = useState('Loading...');

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN' && user.societyId !== Number(societyId)) {
      navigate(`/society/${user.societyId}`, { replace: true });
    }
  }, [user, societyId, navigate]);

  useEffect(() => {
    if (!societyId) return;

    // Fetch society details
    api.get(`/societies/${societyId}`)
      .then(res => {
        const data = res.data;
        if (data && data.name) {
          setSocietyName(data.name);
        }
      })
      .catch(err => {
        console.error("Failed to fetch society", err);
        setSocietyName("Society Overview");
      });

    // Fetch buildings of this society
    api.get(`/buildings?societyId=${societyId}`)
      .then(res => {
        const data = res.data;
        const mapped = data.map((b: any) => ({
          id: b.id.toString(),
          name: b.name,
          deviceCount: b.deviceCount,
          onlineDevices: b.deviceCount, // Mocked for UI compatibility
          offlineDevices: 0,            // Mocked
          activeFaults: 0,              // Mocked
          healthPercentage: 100,        // Mocked
          lastUpdated: new Date().toISOString()
        }));
        const localBuildingsStr = localStorage.getItem('local_buildings');
        const localBuildings = localBuildingsStr ? JSON.parse(localBuildingsStr) : [];
        setBuildings([...mapped, ...localBuildings.filter((b: any) => b.societyId === Number(societyId))]);
      })
      .catch(err => {
        console.error("Failed to fetch buildings", err);
        const localBuildingsStr = localStorage.getItem('local_buildings');
        const localBuildings = localBuildingsStr ? JSON.parse(localBuildingsStr) : [];
        setBuildings(localBuildings.filter((b: any) => b.societyId === Number(societyId)));
      });
  }, [societyId]);

  const handleDeleteLocalBuilding = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const localBuildingsStr = localStorage.getItem('local_buildings');
    const localBuildings = localBuildingsStr ? JSON.parse(localBuildingsStr) : [];
    const updated = localBuildings.filter((b: any) => b.id !== id);
    localStorage.setItem('local_buildings', JSON.stringify(updated));
    setBuildings(prev => prev.filter(b => b.id !== id));
  };

  const stats = useMemo(() => {
    return buildings.reduce(
      (acc, b) => ({
        totalDevices: acc.totalDevices + b.deviceCount,
        onlineDevices: acc.onlineDevices + b.onlineDevices,
        activeFaults: acc.activeFaults + b.activeFaults,
      }),
      { totalDevices: 0, onlineDevices: 0, activeFaults: 0 }
    );
  }, [buildings]);

  const filteredBuildings = useMemo(() => {
    return buildings.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());

      let matchesFilter = true;
      if (filter === 'healthy') matchesFilter = b.healthPercentage === 100;
      if (filter === 'warning') matchesFilter = b.healthPercentage > 90 && b.healthPercentage < 100;
      if (filter === 'critical') matchesFilter = b.healthPercentage <= 90;

      return matchesSearch && matchesFilter;
    });
  }, [search, filter, buildings]);

  const percentageOnline = stats.totalDevices > 0 ? ((stats.onlineDevices / stats.totalDevices) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen bg-gray-50/30 -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 pb-12 text-gray-900 relative">
      <Header facilityName={societyName} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          title="Total Buildings"
          value={buildings.length}
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

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {(['all', 'healthy', 'warning', 'critical'] as const).map(f => {
            const colors = {
              all: 'bg-[#00a651] text-white border-[#00a651]',
              healthy: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700',
              warning: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700',
              critical: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
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
                className={`flex items-center px-5 py-2.5 rounded-full text-xs font-bold capitalize transition-all border shadow-sm ${filter === f ? colors.all : colors[f]
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
          <BuildingCard
            key={building.id}
            building={building}
            onDelete={building.id.startsWith('local-') ? (e) => handleDeleteLocalBuilding(building.id, e) : undefined}
          />
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
