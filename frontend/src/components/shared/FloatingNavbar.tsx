import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Building2, AlertCircle, User, 
  ChevronRight, ChevronLeft, LogOut, 
  LayoutDashboard, Wrench, Cpu, Droplet, 
  Flame, ArrowUpDown, MoreHorizontal, Users, 
  ChevronDown, Boxes, ShieldCheck, Menu, X
} from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import type { RootState } from '../../store';
import logo4m from '../../assets/4MLogo.png';

type MenuItem = {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  isComingSoon?: boolean;
  moduleId?: string;
};

export function FloatingNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
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
      path: '/', 
      icon: <LayoutDashboard size={20} />,
      moduleId: 'dashboard'
    },
    {
      label: 'All Assets',
      path: '/assets',
      icon: <Boxes size={20} />,
      moduleId: 'assets'
    },
    {
      label: 'Master',
      icon: <Settings size={20} />,
      children: [
        {
          label: 'Employee Master',
          path: '/master/employee',
          icon: <Users size={16} />,
          moduleId: 'master_employee'
        },
        {
          label: 'Facility Master',
          path: '/master/main-facility',
          icon: <Building2 size={16} />,
          moduleId: 'master_main_facility'
        },
        {
          label: 'Spare Master',
          path: '/master/spare',
          icon: <Wrench size={16} />,
          moduleId: 'master_spare',
          isComingSoon: true
        }
      ]
    },
    {
      label: 'Manage Access',
      path: '/manage-access',
      icon: <ShieldCheck size={20} />,
      moduleId: 'manage_access'
    },
    {
      label: 'User Management',
      path: '/user-management',
      icon: <Users size={20} />,
      moduleId: 'user_management'
    },
    {
      label: 'Facility Management',
      path: '/facility-management',
      icon: <Building2 size={20} />,
      moduleId: 'facility_management'
    },
    {
      label: 'Machine Management',
      path: '/machine-management',
      icon: <Cpu size={20} />,
      moduleId: 'machine_management'
    }
  ];

  const hasPermission = (moduleId?: string) => {
    if (user?.role === 'SUPER_ADMIN') return true;
    if (!moduleId) return true;
    if (!user?.permissions) return true; // fallback

    const perm = user.permissions.find((p: any) => p.moduleId === moduleId);
    return perm ? perm.canView : false;
  };

  const filteredMenuData = menuData.map(item => {
    if (item.children) {
      const filteredChildren = item.children.filter(child => hasPermission(child.moduleId));
      if (filteredChildren.length > 0) {
        return { ...item, children: filteredChildren };
      }
      return null;
    }
    return hasPermission(item.moduleId) ? item : null;
  }).filter(Boolean) as MenuItem[];

  const isPathActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/society') || location.pathname.startsWith('/societies') || location.pathname.startsWith('/building');
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
            } else if (item.isComingSoon) {
              return; // Do not navigate for modules under development
            } else if (item.path) {
              navigate(item.path);
              setIsMobileMenuOpen(false); // Close on mobile navigation
            }
          }}
          className={`relative flex items-center h-11 w-full transition-all duration-200 focus:outline-none cursor-pointer rounded-lg ${isExpanded ? 'justify-between px-3' : 'justify-center mx-auto w-11'}`}
          title={!isExpanded ? item.label : undefined}
        >
          {((isActive && isExpanded && !hasChildren) || ((isActive || childIsActive) && !isExpanded)) && (
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
            <span className={`shrink-0 transition-colors ${textColor}`}>
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
      <div className={`hidden sm:flex flex-col bg-transparent transition-all duration-300 ease-in-out h-full shrink-0 relative print:hidden ${isExpanded ? 'w-[260px]' : 'w-[88px]'}`}>
        
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
          {filteredMenuData.map(item => renderMenuItem(item))}
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-100 pb-6 relative">
          <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center flex-col gap-4'}`}>
            <div 
              className={`flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-xl transition-colors relative ${!isExpanded ? 'ml-0 p-0 hover:bg-transparent' : ''}`}
              onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mx-auto transition-transform hover:scale-105">
                <User size={18} className="text-emerald-600" />
              </div>
              {isExpanded && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-gray-900 truncate">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username || 'Admin User'}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">{user.role?.replace('_', ' ') || 'User'}</span>
                </div>
              )}

              <AnimatePresence>
                {isProfilePopupOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsProfilePopupOpen(false);
                      }}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={`absolute bottom-[calc(100%+10px)] ${isExpanded ? 'left-0' : 'left-full ml-4'} w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 cursor-default`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/40">
                            <User size={24} className="text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-base font-bold truncate">
                              {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username || 'Admin User'}
                            </span>
                            <span className="text-xs text-emerald-100 truncate">{user.username || 'admin'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">

                        <button 
                          onClick={() => {
                            setIsProfilePopupOpen(false);
                            setIsModalOpen(true);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-1"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            {isExpanded && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-[18px] right-4 sm:hidden z-[60] w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 hover:text-green-600 shadow-sm"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-[55] sm:hidden backdrop-blur-sm"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white z-[60] sm:hidden flex flex-col shadow-2xl"
            >
              {/* Logo Section */}
              <div className="flex items-center select-none p-4 pb-2 h-24 border-b border-gray-100">
                <img src={logo4m} alt="4M Logo" className="h-16 w-auto object-contain" />
              </div>

              {/* Navigation Accordions */}
              <div className="flex-1 flex flex-col p-4 pt-2 overflow-y-auto space-y-1">
                {filteredMenuData.map(item => renderMenuItem(item))}
              </div>

              {/* User Profile Section */}
              <div className="p-4 border-t border-gray-100 pb-6 bg-gray-50 relative">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 -mx-2 rounded-xl transition-colors"
                  onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-emerald-100 flex items-center justify-center shrink-0">
                      <User size={18} className="text-emerald-500" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-bold text-gray-900 truncate">
                        {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username || 'Admin User'}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{user.role?.replace('_', ' ') || 'User'}</span>
                    </div>
                  </div>
                  
                  <ChevronDown size={16} className={`text-gray-400 mr-2 transition-transform ${isProfilePopupOpen ? 'rotate-180' : ''}`} />
                </div>

                <AnimatePresence>
                  {isProfilePopupOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-1 mt-2 bg-white rounded-xl border border-gray-200 p-2 shadow-sm">

                        <button 
                          onClick={() => {
                            setIsProfilePopupOpen(false);
                            setIsMobileMenuOpen(false);
                            setIsModalOpen(true);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <LogoutConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}
