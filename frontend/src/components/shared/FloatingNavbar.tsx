import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Building2, AlertCircle, User, 
  ChevronRight, ChevronLeft, LogOut, 
  LayoutDashboard, Wrench, Cpu, Droplet, 
  Flame, ArrowUpDown, MoreHorizontal, Users, 
  ChevronDown, Boxes, ShieldCheck, Menu, X, Key, Calendar,
  ClipboardList, Package, Briefcase
} from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { NotificationBell } from './NotificationBell';
import type { RootState } from '../../store';
import logo4m from '../../assets/4MLogo.png';

type MenuItem = {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  isComingSoon?: boolean;
  moduleId?: string;
  packageType?: 'CMMS' | 'IOT';
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
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
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
      icon: <LayoutDashboard size={15} />,
      moduleId: 'dashboard'
    },
    {
      label: 'All Assets',
      path: '/assets',
      icon: <Boxes size={15} />,
      moduleId: 'assets'
    },
    {
      label: 'Master',
      icon: <Settings size={15} />,
      children: [
        {
          label: 'Employee Master',
          path: '/master/employee',
          icon: <Users size={13} />,
          moduleId: 'master_employee'
        },
      ]
    },
    {
      label: 'Manage Access',
      path: '/manage-access',
      icon: <ShieldCheck size={15} />,
      moduleId: 'manage_access'
    },
    {
      label: 'User Management',
      path: '/user-management',
      icon: <Users size={15} />,
      moduleId: 'user_management'
    },
    {
      label: 'Facility Management',
      path: '/facility-management',
      icon: <Building2 size={15} />,
      moduleId: 'facility_management'
    },
    {
      label: 'Machine Management',
      path: '/machine-management',
      icon: <Cpu size={15} />,
      moduleId: 'machine_management'
    },
    {
      label: 'Spares Management',
      path: '/spares',
      icon: <Package size={15} />,
      moduleId: 'spares',
      packageType: 'CMMS'
    },
    {
      label: 'Suppliers Management',
      path: '/suppliers',
      icon: <Briefcase size={15} />,
      moduleId: 'suppliers',
      packageType: 'CMMS'
    },
    {
      label: 'Work Orders',
      path: '/work-orders',
      icon: <ClipboardList size={15} />,
      moduleId: 'work_orders',
      packageType: 'CMMS'
    },
    {
      label: 'Schedule Maintenance',
      path: '/schedules',
      icon: <Calendar size={15} />,
      moduleId: 'schedules',
      packageType: 'CMMS'
    },
    {
      label: 'HYPN System',
      icon: <Droplet size={15} />,
      packageType: 'IOT',
      children: [
        {
          label: 'Societies',
          path: '/societies',
          icon: <Building2 size={13} />,
          moduleId: 'dashboard',
          packageType: 'IOT'
        },
        {
          label: 'Alerts',
          path: '/devices',
          icon: <AlertCircle size={13} />,
          moduleId: 'dashboard',
          packageType: 'IOT'
        }
      ]
    }
  ];

  const hasPermission = (moduleId?: string) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (!moduleId) return true;
    if (!user.permissions || !Array.isArray(user.permissions)) return false;

    const perm = user.permissions.find((p: any) => p.moduleId === moduleId);
    if (!perm && moduleId === 'assets') {
      const mmPerm = user.permissions.find((p: any) => p.moduleId === 'machine_management');
      if (mmPerm && mmPerm.canView) return true;
      const fmPerm = user.permissions.find((p: any) => p.moduleId === 'facility_management');
      if (fmPerm && fmPerm.canView) return true;
    }
    return perm ? !!perm.canView : false;
  };

  const filteredMenuData = menuData.map(item => {
    const userAccess = user?.moduleAccess || 'BOTH';
    if (userAccess === 'CMMS' && item.packageType === 'IOT') return null;
    if (userAccess === 'IOT' && item.packageType === 'CMMS') return null;

    if (item.children) {
      const filteredChildren = item.children.filter(child => {
        if (userAccess === 'CMMS' && child.packageType === 'IOT') return false;
        if (userAccess === 'IOT' && child.packageType === 'CMMS') return false;
        return hasPermission(child.moduleId);
      });
      if (filteredChildren.length > 0) {
        return { ...item, children: filteredChildren };
      }
      return null;
    }
    return hasPermission(item.moduleId) ? item : null;
  }).filter(Boolean) as MenuItem[];

  const isPathActive = (path?: string) => {
    if (!path) return false;
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    if (path === '/societies') {
      return location.pathname.startsWith('/society') || location.pathname.startsWith('/societies') || location.pathname.startsWith('/building');
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

    const isCurrentActive = (isActive && !hasChildren) || (childIsActive && !isExpanded);

    return (
      <div key={item.label} className="w-full">
        <button
          onClick={() => {
            if (hasChildren) {
              toggleMenu(item.label);
            } else if (item.isComingSoon) {
              return;
            } else if (item.path) {
              navigate(item.path);
              setIsMobileMenuOpen(false);
            }
          }}
          className={`relative group flex items-center transition-all duration-150 focus:outline-none cursor-pointer rounded-md ${
            isExpanded 
              ? 'w-full h-[28px] px-2 justify-between' 
              : 'w-7 h-7 mx-auto justify-center'
          } ${
            isCurrentActive
              ? 'bg-emerald-50/90 text-emerald-700 font-semibold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
          } ${
            isCurrentActive
              ? isExpanded
                ? 'before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-emerald-600 before:rounded-r-sm'
                : 'before:absolute before:left-0.5 before:top-1 before:bottom-1 before:w-[2px] before:bg-emerald-600 before:rounded-r-sm'
              : ''
          }`}
          title={!isExpanded ? item.label : undefined}
        >
          <div className={`flex items-center ${isExpanded ? 'w-full min-w-0' : 'justify-center'} z-10`}>
            <span className={`shrink-0 transition-colors ${
              isCurrentActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
            }`}>
              {item.icon}
            </span>
            
            {isExpanded && (
              <span className="text-xs tracking-tight ml-2 flex-1 text-left truncate transition-colors leading-none">
                {item.label}
              </span>
            )}

            {isExpanded && item.isComingSoon && (
              <span className="text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-1 py-0.5 rounded ml-1 shrink-0">
                Soon
              </span>
            )}
            
            {isExpanded && hasChildren && (
              <span className={`transition-transform duration-200 text-slate-400 group-hover:text-slate-600 ml-1 shrink-0 ${isMenuExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown size={11} />
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
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="ml-3 pl-2 border-l border-slate-200/80 flex flex-col mt-0.5 space-y-[2px]">
                  {item.children!.map(child => {
                    const isChildActive = isPathActive(child.path);
                    return (
                      <button
                        key={child.label}
                        onClick={() => {
                          if (child.path) {
                            navigate(child.path);
                            setIsMobileMenuOpen(false);
                          }
                        }}
                        className={`h-[24px] px-2 rounded flex items-center justify-between text-xs transition-all cursor-pointer relative group ${
                          isChildActive
                            ? 'bg-emerald-50 text-emerald-700 font-semibold before:absolute before:-left-[10px] before:top-1 before:bottom-1 before:w-[2px] before:bg-emerald-600'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={isChildActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}>
                            {child.icon}
                          </span>
                          <span className="truncate">{child.label}</span>
                        </div>
                      </button>
                    );
                  })}
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
      {/* Desktop Fiix CMMS Sidebar */}
      <aside className={`hidden sm:flex flex-col bg-white border-r border-slate-200/90 transition-all duration-300 ease-in-out h-full shrink-0 relative z-50 select-none shadow-xs print:hidden ${isExpanded ? 'w-[230px]' : 'w-[64px]'}`}>
        
        {/* Toggle Expand Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-2.5 top-[11px] w-5 h-5 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-400 hover:shadow-xs transition-all duration-150 z-50 shadow-xs cursor-pointer"
          title={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isExpanded ? <ChevronLeft size={11} strokeWidth={2.5} /> : <ChevronRight size={11} strokeWidth={2.5} />}
        </button>

        {/* Logo Section */}
        <div className={`flex items-center px-3 h-[42px] border-b border-slate-100 shrink-0 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
          <img 
            src={logo4m} 
            alt="4M Logo" 
            className={isExpanded ? "h-6 w-auto max-w-[100px] object-contain" : "h-5 w-auto object-contain"} 
          />
          {isExpanded && (
            <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded">
              CMMS
            </span>
          )}
        </div>

        {/* Navigation Accordions */}
        <div className="flex-1 flex flex-col p-1 overflow-y-auto space-y-[2px] custom-scrollbar">
          {filteredMenuData.map(item => renderMenuItem(item))}
        </div>

        {/* User Profile Section */}
        <div className="p-1.5 border-t border-slate-200/80 bg-slate-50/50 relative shrink-0">
          <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center flex-col gap-1.5'}`}>
            <div 
              className={`flex items-center gap-1.5 cursor-pointer hover:bg-white p-1 rounded-md border border-transparent hover:border-slate-200/80 transition-all relative ${!isExpanded ? 'p-0 hover:bg-transparent hover:border-transparent' : 'flex-1 min-w-0 mr-1'}`}
              onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}
            >
              <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0 font-bold text-[11px] shadow-xs">
                {user.firstName ? user.firstName.charAt(0).toUpperCase() : (user.username ? user.username.charAt(0).toUpperCase() : 'U')}
              </div>
              
              {isExpanded && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-800 truncate leading-tight">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username || 'Admin User'}
                  </span>
                  <span className="text-[8.5px] text-slate-500 uppercase tracking-wider font-medium truncate">
                    {user.role === 'SUPER_ADMIN' ? 'Admin' : (user.designation || user.employee?.designation || user.role || 'Staff')}
                  </span>
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
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.12 }}
                      className={`absolute bottom-[calc(100%+8px)] ${isExpanded ? 'left-0' : 'left-full ml-3'} w-56 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50 cursor-default`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center shrink-0 border border-white/30 font-bold text-xs">
                            {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate">
                              {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username || 'Admin User'}
                            </span>
                            <span className="text-[10px] text-emerald-100 truncate">{user.email || user.username}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-1 space-y-0.5">
                        <button 
                          onClick={() => {
                            setIsProfilePopupOpen(false);
                            setIsChangePasswordModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-md transition-colors cursor-pointer"
                        >
                          <Key size={13} className="text-slate-400" />
                          Change Password
                        </button>
                        <button 
                          onClick={() => {
                            setIsProfilePopupOpen(false);
                            setIsModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <LogOut size={13} className="text-rose-500" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {isExpanded ? (
              <div className="flex items-center gap-0.5 shrink-0">
                <NotificationBell isExpanded={isExpanded} />
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1 items-center">
                <NotificationBell isExpanded={isExpanded} />
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-2 right-3 sm:hidden z-[60] w-8 h-8 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-600 hover:text-emerald-600 shadow-xs cursor-pointer"
      >
        {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
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
              className="fixed inset-0 bg-slate-900/40 z-[55] sm:hidden backdrop-blur-xs"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[240px] bg-white z-[60] sm:hidden flex flex-col shadow-xl border-r border-slate-200"
            >
              {/* Logo Section */}
              <div className="flex items-center justify-between px-3 h-[42px] border-b border-slate-100">
                <img src={logo4m} alt="4M Logo" className="h-6 w-auto object-contain" />
                <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded">
                  CMMS
                </span>
              </div>

              {/* Navigation Accordions */}
              <div className="flex-1 flex flex-col p-1 overflow-y-auto space-y-[2px] custom-scrollbar">
                {filteredMenuData.map(item => renderMenuItem(item))}
              </div>

              {/* User Profile Section */}
              <div className="p-2 border-t border-slate-200/80 bg-slate-50/60">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-white p-1.5 rounded-md border border-slate-200/80 transition-colors"
                  onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 font-bold text-xs">
                      {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username || 'Admin User'}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-medium truncate">
                        {user.role === 'SUPER_ADMIN' ? 'Admin' : (user.role || 'User')}
                      </span>
                    </div>
                  </div>
                  
                  <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isProfilePopupOpen ? 'rotate-180' : ''}`} />
                </div>

                <AnimatePresence>
                  {isProfilePopupOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-1 mt-2 bg-white rounded-lg border border-slate-200 p-1.5 shadow-xs">
                        <button 
                          onClick={() => {
                            setIsProfilePopupOpen(false);
                            setIsMobileMenuOpen(false);
                            setIsChangePasswordModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-md transition-colors"
                        >
                          <Key size={14} />
                          Change Password
                        </button>
                        <button 
                          onClick={() => {
                            setIsProfilePopupOpen(false);
                            setIsMobileMenuOpen(false);
                            setIsModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <LogOut size={14} />
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

      <ChangePasswordModal 
        isOpen={isChangePasswordModalOpen} 
        onClose={() => setIsChangePasswordModalOpen(false)} 
      />
    </>
  );
}
