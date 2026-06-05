import { useState, type ReactNode } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Menu } from 'lucide-react';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
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
        <div className="lg:hidden flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-150 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors border border-gray-200"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="font-bold text-gray-950 text-sm leading-tight">Gera Imperium</h2>
              <p className="text-[10px] text-gray-500 font-medium">IoT BMS Platform</p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide">
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
