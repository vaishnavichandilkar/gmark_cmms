import { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, Building2, CheckCircle2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { FloatingNavbar } from '../components/shared/FloatingNavbar';
import type { RootState } from '../store';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Clean Fiix breadcrumb logic based on pathname
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(p => p);
    if (paths.length === 0) return [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Command Center' }];
    
    const breadcrumbs: { label: string, path?: string }[] = [{ label: 'Dashboard', path: '/dashboard' }];
    
    if (paths[0] === 'dashboard') {
      return [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Command Center' }];
    }
    if (paths[0] === 'admin') breadcrumbs.push({ label: 'Admin Settings' });
    else if (paths[0] === 'devices') breadcrumbs.push({ label: 'Alerts & Devices' });
    else if (paths[0] === 'profile') breadcrumbs.push({ label: 'User Profile' });
    else if (paths[0] === 'society') breadcrumbs.push({ label: 'Facility Overview' });
    else if (paths[0] === 'building') breadcrumbs.push({ label: 'Building Details' });
    else if (paths[0] === 'scada') breadcrumbs.push({ label: 'SCADA System' });
    else if (paths[0] === 'societies') breadcrumbs.push({ label: 'Societies Directory' });
    else {
      let accumulatedPath = '';
      paths.forEach((pathSegment, index) => {
        accumulatedPath += `/${pathSegment}`;
        
        if (!isNaN(Number(pathSegment)) || pathSegment.length > 20) {
           breadcrumbs.push({ label: 'Details' });
        } else {
           const formattedLabel = pathSegment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
           breadcrumbs.push({ 
             label: formattedLabel, 
             path: index < paths.length - 1 ? accumulatedPath : undefined 
           });
        }
      });
      return breadcrumbs;
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const currentCrumb = breadcrumbs[breadcrumbs.length - 1];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative font-sans text-slate-900">
      {/* Sidebar - Modern compact Fiix CMMS Sidebar */}
      <FloatingNavbar />

      {/* Main Content Area */}
      <div className="main-content flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        {/* Modern Fiix Top Navbar */}
        <header className="w-full bg-white border-b border-slate-200/90 h-[56px] px-4 sm:px-6 flex items-center justify-between z-40 shrink-0 shadow-xs print:hidden">
          
          {/* Breadcrumbs Trail */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 overflow-x-auto py-1">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors flex items-center gap-1 shrink-0"
              title="Home"
            >
              <Home size={14} />
            </button>
            <ChevronRight size={12} className="text-slate-300 shrink-0" />
            
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              if (index === 0 && crumb.label === 'Dashboard' && breadcrumbs.length > 1) {
                return null; // Avoid redundant "Home > Dashboard > ..."
              }
              return (
                <div key={`${crumb.label}-${index}`} className="flex items-center gap-1.5 shrink-0">
                  <span 
                    onClick={() => crumb.path && navigate(crumb.path)}
                    className={`${
                      isLast 
                        ? 'text-slate-900 font-bold bg-slate-100/70 px-2 py-0.5 rounded-md text-[13px]' 
                        : 'text-slate-500 hover:text-blue-600 transition-colors'
                    } ${crumb.path && !isLast ? 'cursor-pointer hover:underline' : ''}`}
                  >
                    {crumb.label}
                  </span>
                  {!isLast && (
                    <ChevronRight size={12} className="text-slate-300 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Header Badges & Context */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {/* System Status Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-full text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>CMMS Online</span>
            </div>

            {/* User Quick Info */}
            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded">
                  {user.role === 'SUPER_ADMIN' ? 'Admin' : (user.role || 'User')}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto bg-slate-50">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
