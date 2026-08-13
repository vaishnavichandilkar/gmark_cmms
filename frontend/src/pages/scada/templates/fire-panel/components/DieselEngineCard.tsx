import React from 'react';
import { DieselEngine3DModel } from './DieselEngine3DModel';

export const DieselEngineCard: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-2 col-span-1 md:col-span-2 h-full min-h-[250px]">
      <div className="w-full max-w-[420px] flex justify-center items-center h-full">
        <DieselEngine3DModel />
      </div>
    </div>
  );
};
