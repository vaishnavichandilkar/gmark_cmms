import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useMqttStore } from '../../store/useMqttStore';
import { REGISTER_MAP } from '../../utils/constants';

export const RegisterTable: React.FC = () => {
  const { rawRegisters, lastUpdated } = useMqttStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRegisters = rawRegisters.filter(reg => {
    const name = REGISTER_MAP[reg.register] || `Register ${reg.register}`;
    return (
      reg.register.includes(searchTerm) || 
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col shadow-lg overflow-hidden h-[500px]">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <h2 className="text-lg font-bold text-white">Live Register Monitor</h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search register or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-sm rounded-lg pl-9 pr-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-950/50 text-slate-400 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-3 font-medium">Register</th>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium text-right">Value</th>
              <th className="px-6 py-3 font-medium text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredRegisters.length > 0 ? (
              filteredRegisters.map((reg) => (
                <tr key={reg.register} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-3 font-mono text-emerald-400">{reg.register}</td>
                  <td className="px-6 py-3">{REGISTER_MAP[reg.register] || 'Unknown Register'}</td>
                  <td className="px-6 py-3 font-bold text-right text-white">{reg.value}</td>
                  <td className="px-6 py-3 text-right text-xs text-slate-500">
                    {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  {rawRegisters.length === 0 ? 'No data received yet.' : 'No registers found matching search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
