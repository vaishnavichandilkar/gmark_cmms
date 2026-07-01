import { type ReactNode } from 'react';
import { FloatingNavbar } from '../components/FloatingNavbar';
import { TopHeaderActions } from '../components/TopHeaderActions';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      {/* Top Header Actions Bar */}
      <div className="w-full flex justify-between items-center p-4 sm:p-6 md:p-8 pb-0 z-40">
        {/* Glowing Logo Mark & Text */}
        <div className="flex items-center gap-3.5 select-none">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 p-0.5 shadow-lg shadow-teal-500/25">
            <div className="w-full h-full bg-[#0d111b] rounded-[10px] flex items-center justify-center">
              <span className="text-xl font-black bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
                H
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent leading-none">
              HYPN
            </span>
            <span className="text-[9.5px] font-bold text-zinc-500 tracking-[0.22em] uppercase leading-none mt-1">
              IoT Monitor
            </span>
          </div>
        </div>

        <TopHeaderActions />
      </div>

      {/* Floating Glass Navbar */}
      <FloatingNavbar />

      {/* Main Content Area with bottom padding to clear the bottom floating navbar */}
      <div className="flex-1 min-w-0 flex flex-col pb-32 sm:pb-36">
        <div className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
