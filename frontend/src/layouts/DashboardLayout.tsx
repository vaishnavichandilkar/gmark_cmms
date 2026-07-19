import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { FloatingNavbar } from '../components/FloatingNavbar';
import { TopHeaderActions } from '../components/TopHeaderActions';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  
  // Simple breadcrumb logic based on pathname
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(p => p);
    if (paths.length === 0) return ['Dashboard', 'Societies'];
    
    const breadcrumbs = ['Dashboard'];
    if (paths[0] === 'admin') breadcrumbs.push('Admin Settings');
    else if (paths[0] === 'devices') breadcrumbs.push('Alerts & Devices');
    else if (paths[0] === 'profile') breadcrumbs.push('User Profile');
    else if (paths[0] === 'society') breadcrumbs.push('Facility Overview');
    else if (paths[0] === 'building') breadcrumbs.push('Building Details');
    else if (paths[0] === 'scada') breadcrumbs.push('SCADA System');
    else breadcrumbs.push(paths[0].charAt(0).toUpperCase() + paths[0].slice(1));
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative font-sans text-gray-900">
      {/* Sidebar - sits on the gray background */}
      <FloatingNavbar />

      {/* Main Content Area - White rounded box */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-l-2xl md:rounded-2xl shadow-sm my-0 md:my-3 mr-0 md:mr-3 overflow-hidden border border-gray-200/60">
        {/* Top Navbar */}
        <header className="w-full bg-white border-b border-gray-100 p-4 sm:px-6 md:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-40 shrink-0">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-gray-500">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb} className="flex items-center gap-2">
                <span className={index === breadcrumbs.length - 1 ? 'text-gray-900 font-bold' : 'hover:text-gray-700 cursor-pointer transition-colors'}>
                  {crumb}
                </span>
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight size={14} className="text-gray-400" />
                )}
              </div>
            ))}
          </div>

          <TopHeaderActions />
        </header>

        <div className="flex-1 p-4 sm:p-6 md:p-8 pb-32 sm:pb-8 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
