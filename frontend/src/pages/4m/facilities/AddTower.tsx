import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AddTower() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [floors, setFloors] = useState('');
  const [totalFlats, setTotalFlats] = useState('');
  const [tagline, setTagline] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Create new building object matching the Building type
    const newBuilding = {
      id: `local-${Date.now()}`,
      name: name.trim(),
      deviceCount: 0,
      onlineDevices: 0,
      offlineDevices: 0,
      activeFaults: 0,
      healthPercentage: 100,
      lastUpdated: new Date().toISOString(),
      // Additional properties stored in state
      description: description.trim(),
      floors: floors.trim(),
      totalFlats: totalFlats.trim(),
      tagline: tagline.trim()
    };

    // Save to localStorage
    const localBuildingsStr = localStorage.getItem('local_buildings');
    const localBuildings = localBuildingsStr ? JSON.parse(localBuildingsStr) : [];
    localBuildings.push(newBuilding);
    localStorage.setItem('local_buildings', JSON.stringify(localBuildings));

    // Redirect to building list (dashboard)
    navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen bg-[#f6f8fc] -m-4 sm:-m-6 md:-m-8 p-6 sm:p-10 md:p-16 text-black flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-lg bg-white rounded-[32px] p-8 md:p-12 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col items-center">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#051c33] mb-4 text-center tracking-tight">
          Add Tower
        </h1>

        {/* Capsule Badge */}
        <div className="bg-[#2a3b4e] text-white px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide mb-8 text-center shadow-xs">
          Add Tower in Gera Imperium Society
        </div>

        {/* Form */}
        <form className="w-full space-y-6" onSubmit={handleSubmit}>
          {/* Tower Name */}
          <div className="flex flex-col">
            <input
              type="text"
              placeholder="Tower Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border-2 border-[#102a43] bg-white text-[#102a43] placeholder-[#102a43]/60 focus:outline-none focus:ring-4 focus:ring-[#102a43]/15 focus:border-[#102a43] font-semibold text-base transition-all"
              required
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 pl-2 uppercase tracking-wider">
              Description
            </label>
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border-2 border-[#102a43] bg-white text-[#102a43] placeholder-[#102a43]/60 focus:outline-none focus:ring-4 focus:ring-[#102a43]/15 focus:border-[#102a43] font-semibold text-base transition-all"
              required
            />
          </div>

          {/* Floors */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 pl-2 uppercase tracking-wider">
              Floors
            </label>
            <input
              type="text"
              placeholder="Floors"
              value={floors}
              onChange={(e) => setFloors(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border-2 border-[#102a43] bg-white text-[#102a43] placeholder-[#102a43]/60 focus:outline-none focus:ring-4 focus:ring-[#102a43]/15 focus:border-[#102a43] font-semibold text-base transition-all"
              required
            />
          </div>

          {/* Total Flats */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 pl-2 uppercase tracking-wider">
              Total Flats
            </label>
            <input
              type="text"
              placeholder="Total Flats"
              value={totalFlats}
              onChange={(e) => setTotalFlats(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border-2 border-[#102a43] bg-white text-[#102a43] placeholder-[#102a43]/60 focus:outline-none focus:ring-4 focus:ring-[#102a43]/15 focus:border-[#102a43] font-semibold text-base transition-all"
              required
            />
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 pl-2 uppercase tracking-wider">
              Tagline
            </label>
            <input
              type="text"
              placeholder="Tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border-2 border-[#102a43] bg-white text-[#102a43] placeholder-[#102a43]/60 focus:outline-none focus:ring-4 focus:ring-[#102a43]/15 focus:border-[#102a43] font-semibold text-base transition-all"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-[#051c33] text-white py-4.5 rounded-2xl font-bold hover:bg-[#0c2b4c] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(5,28,51,0.15)] text-center text-lg cursor-pointer"
            >
              Add Tower
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
