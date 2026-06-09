import { useState, type ReactNode } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Menu } from 'lucide-react';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar with responsiveness props */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        {/* Sticky Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-3.5 bg-black border-b border-white/10 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors border border-white/10"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="font-bold text-white text-sm leading-tight">Gera Imperium</h2>
              <p className="text-[10px] text-gray-400 font-medium">IoT BMS Platform</p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide">
            Live
          </span>
        </div>

        {/* Dynamic Padding Content area */}
        <div className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
