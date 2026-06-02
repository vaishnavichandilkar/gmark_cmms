import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMqttStore } from '../../store/useMqttStore';

export const RealTimeCharts: React.FC = () => {
  const { historicalData } = useMqttStore();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Voltage Chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-5 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Phase Voltages Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Line type="monotone" dataKey="voltageRY" name="R-Y Voltage" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="voltageYB" name="Y-B Voltage" stroke="#eab308" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="voltageRB" name="R-B Voltage" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Current & Pressure Chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-5 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">System Pressure & M1 Current</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Line yAxisId="left" type="monotone" dataKey="pressure" name="Pressure (Bar)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="currentM1R" name="M1 R Current (A)" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
