import { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { FloatingNavbar } from '../components/shared/FloatingNavbar';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Simple breadcrumb logic based on pathname
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(p => p);
    if (paths.length === 0) return [{ label: 'Dashboard', path: '/' }, { label: 'Command Center' }];
    
    const breadcrumbs: { label: string, path?: string }[] = [{ label: 'Dashboard', path: '/' }];
    
    if (paths[0] === 'admin') breadcrumbs.push({ label: 'Admin Settings' });
    else if (paths[0] === 'devices') breadcrumbs.push({ label: 'Alerts & Devices' });
    else if (paths[0] === 'profile') breadcrumbs.push({ label: 'User Profile' });
    else if (paths[0] === 'society') breadcrumbs.push({ label: 'Facility Overview' });
    else if (paths[0] === 'building') breadcrumbs.push({ label: 'Building Details' });
    else if (paths[0] === 'scada') breadcrumbs.push({ label: 'SCADA System' });
    else if (paths[0] === 'societies') breadcrumbs.push({ label: 'Societies Directory' });
    else {
      // General case for other routes
      let accumulatedPath = '';
      paths.forEach((pathSegment, index) => {
        accumulatedPath += `/${pathSegment}`;
        
        // Skip IDs in breadcrumbs or format them nicely
        if (!isNaN(Number(pathSegment)) || pathSegment.length > 20) {
           breadcrumbs.push({ label: 'Details' });
        } else {
           // Format path segment: capitalize and replace dashes with spaces
           const formattedLabel = pathSegment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
           breadcrumbs.push({ 
             label: formattedLabel, 
             // Only make intermediate segments clickable, except if it's the very last segment
             path: index < paths.length - 1 ? accumulatedPath : undefined 
           });
        }
      });
      return breadcrumbs; // return early since we fully processed paths
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative font-sans text-gray-900">
      {/* Sidebar - sits on the gray background */}
      <FloatingNavbar />

      {/* Main Content Area - White rounded box */}
      <div className="main-content flex-1 flex flex-col min-w-0 bg-white rounded-l-2xl md:rounded-2xl shadow-sm my-0 md:my-3 mr-0 md:mr-3 overflow-hidden border border-gray-200/60 print:border-none print:m-0 print:shadow-none print:rounded-none">
        {/* Top Navbar */}
        <header className="w-full bg-white border-b border-gray-100 p-4 pr-16 sm:px-6 md:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-40 shrink-0 min-h-[76px]">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-gray-500">
            {breadcrumbs.map((crumb, index) => (
              <div key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                <span 
                  onClick={() => crumb.path && navigate(crumb.path)}
                  className={index === breadcrumbs.length - 1 ? 'text-gray-900 font-bold' : `hover:text-gray-700 transition-colors ${crumb.path ? 'cursor-pointer' : ''}`}
                >
                  {crumb.label}
                </span>
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight size={14} className="text-gray-400" />
                )}
              </div>
            ))}
          </div>


        </header>

        <div className="flex-1 p-4 sm:p-6 md:p-8 pb-8 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
