import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Building2, AlertCircle, User, 
  ChevronRight, ChevronLeft, LogOut, 
  LayoutDashboard, Wrench, Cpu, Droplet, 
  Flame, ArrowUpDown, MoreHorizontal, Users, 
  ChevronDown
} from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import type { RootState } from '../store';
import logo4m from '../assets/4MLogo.png';

type MenuItem = {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  isComingSoon?: boolean;
};

export function FloatingNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'IOT': true,
    'HYPN': true,
  });

  if (!isAuthenticated || !user) return null;

  const handleLogoutConfirm = () => {
    setIsModalOpen(false);
    dispatch(logout());
    navigate('/login');
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
    if (!isExpanded) setIsExpanded(true);
  };

  const menuData: MenuItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard', 
      icon: <LayoutDashboard size={20} />
    },
    {
      label: 'Master',
      icon: <Settings size={20} />,
      children: [
        {
          label: 'Employee Master',
          path: '/master/employee',
          icon: <Users size={16} />
        },
        {
          label: 'Main Facility Master',
          path: '/master/main-facility',
          icon: <Building2 size={16} />
        }
      ]
    },
    {
      label: 'User Management',
      path: '/user-management',
      icon: <Users size={20} />
    },
    {
      label: 'Facility Management',
      path: '/facility-management',
      icon: <Building2 size={20} />
    }
  ];

  const isPathActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/society') || location.pathname.startsWith('/building');
    }
    return location.pathname.startsWith(path);
  };

  const isAnyChildActive = (item: MenuItem): boolean => {
    if (isPathActive(item.path)) return true;
    if (item.children) {
      return item.children.some(child => isAnyChildActive(child));
    }
    return false;
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = !!item.children;
    const isMenuExpanded = expandedMenus[item.label];
    const isActive = isPathActive(item.path);
    const childIsActive = hasChildren && isAnyChildActive(item);
    
    if (!isExpanded && level > 0) return null;

    const paddingLeft = isExpanded && level > 0 ? `${level * 1.5}rem` : '0';
    
    const textColor = isActive 
      ? 'text-gray-900 font-bold' 
      : childIsActive 
        ? 'text-gray-900 font-semibold' 
        : 'text-gray-500 hover:text-gray-900';

    return (
      <div key={item.label} className="w-full">
        <button
          onClick={() => {
            if (hasChildren) {
              toggleMenu(item.label);
            } else if (item.path) {
              navigate(item.path);
            }
          }}
          className={`relative flex items-center h-11 w-full transition-all duration-200 focus:outline-none cursor-pointer rounded-lg ${isExpanded ? 'justify-between px-3' : 'justify-center mx-auto w-11'}`}
          title={!isExpanded ? item.label : undefined}
        >
          {isActive && isExpanded && !hasChildren && (
             <motion.div
               layoutId="activeTabBg"
               transition={{ type: 'spring', stiffness: 380, damping: 30 }}
               className="absolute inset-0 rounded-lg bg-white shadow-sm border border-gray-100"
             />
          )}

          <div 
            className={`relative flex items-center ${isExpanded ? 'w-full' : 'justify-center'} z-10`}
            style={{ paddingLeft: isExpanded ? paddingLeft : undefined }}
          >
            <span className={`shrink-0 transition-colors ${textColor} ${!isExpanded && isActive ? 'text-green-600' : ''}`}>
              {item.icon}
            </span>
            
            {isExpanded && (
              <span className={`${level > 0 ? 'text-[12px]' : 'text-[13px]'} tracking-wide ml-3 transition-colors ${textColor} flex-1 text-left truncate`}>
                {item.label}
              </span>
            )}

            {isExpanded && item.isComingSoon && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded ml-2">
                Soon
              </span>
            )}
            
            {isExpanded && hasChildren && (
              <span className={`transition-transform duration-200 text-gray-400 ${isMenuExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown size={14} />
              </span>
            )}
          </div>
        </button>

        {hasChildren && isExpanded && (
          <AnimatePresence initial={false}>
            {isMenuExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col mt-1 space-y-0.5">
                  {item.children!.map(child => renderMenuItem(child, level + 1))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden sm:flex flex-col bg-transparent transition-all duration-300 ease-in-out h-full shrink-0 relative ${isExpanded ? 'w-[260px]' : 'w-[88px]'}`}>
        
        {/* Toggle Expand Button - perfectly centered on the boundary */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-4 top-[42px] w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-green-600 hover:border-green-500 hover:shadow-md transition-all duration-200 z-50 shadow-sm"
        >
          {isExpanded ? <ChevronLeft size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}
        </button>

        {/* Logo Section */}
        <div className={`flex items-center select-none p-4 pb-2 h-28 ${isExpanded ? 'justify-start' : 'justify-center overflow-hidden'}`}>
          <img src={logo4m} alt="4M Logo" className={isExpanded ? "h-20 w-auto object-contain" : "w-20 h-auto object-contain"} />
        </div>

        {/* Navigation Accordions */}
        <div className="flex-1 flex flex-col p-4 pt-2 overflow-y-auto space-y-1">
          {menuData.map(item => renderMenuItem(item))}
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-100 pb-6">
          <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center flex-col gap-4'}`}>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mx-auto cursor-pointer hover:bg-gray-200 transition-colors" 
                onClick={() => navigate('/profile')} 
                title="Profile"
              >
                <User size={18} className="text-gray-400" />
              </div>
              {isExpanded && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-gray-900 truncate">{user.name || 'Admin User'}</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">{user.role.replace('_', ' ')}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center justify-center w-10 h-10 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0 ${!isExpanded ? 'bg-gray-50 border border-gray-100' : ''}`}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 select-none w-[90%] max-w-sm">
        <div className="bg-white border border-gray-200 rounded-full p-2 flex flex-row items-center justify-around shadow-lg">
           {[
             { path: '/admin', icon: <LayoutDashboard size={20} /> },
             { path: '/', icon: <Building2 size={20} /> },
             { path: '/devices', icon: <AlertCircle size={20} /> },
             { path: '/profile', icon: <User size={20} /> }
           ].map((tab) => {
              const isActive = isPathActive(tab.path);
              const textColor = isActive ? 'text-gray-900' : 'text-gray-400';

              return (
                 <button
                   key={tab.path}
                   onClick={() => navigate(tab.path)}
                   className="relative flex items-center justify-center h-12 w-12 transition-all duration-300 focus:outline-none cursor-pointer"
                 >
                   {isActive ? (
                     <motion.div
                       layoutId="mobileActiveTabPill"
                       transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                       className={`w-full h-full flex items-center justify-center rounded-full bg-gray-100`}
                     >
                       <span className={`shrink-0 ${textColor}`}>{tab.icon}</span>
                     </motion.div>
                   ) : (
                     <div className="flex items-center justify-center w-full h-full text-gray-400 hover:text-gray-900 transition-colors duration-200">
                       {tab.icon}
                     </div>
                   )}
                 </button>
              )
           })}
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}
