import React from 'react';

export const FlushingSystemDashboard: React.FC = () => {
  return (
    <div 
      className="min-h-screen p-4 flex items-center justify-center relative"
      style={{
        backgroundColor: '#050505',
        backgroundImage: 'radial-gradient(circle at top left, rgba(0,180,255,0.08), transparent 40%), radial-gradient(circle at bottom right, rgba(0,255,170,0.05), transparent 50%)'
      }}
    >
      <h1 className="text-white text-2xl font-bold tracking-widest uppercase">Coming Soon</h1>
    </div>
  );
};
