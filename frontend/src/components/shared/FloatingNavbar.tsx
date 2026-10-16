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
        /*
        {
          label: 'Facility Master',
          path: '/master/main-facility',
          icon: <Building2 size={16} />,
          moduleId: 'master_main_facility'
        },
        {
          label: 'Spare Master',
          path: '/spares',
          icon: <Package size={16} />,
          moduleId: 'master_spare'
        },
        {
          label: 'Supplier Master',
          path: '/suppliers',
          icon: <Briefcase size={16} />,
          moduleId: 'master_supplier'
        }
        */
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
    },
    {
      label: 'Spares Management',
      path: '/spares',
      icon: <Package size={20} />,
      moduleId: 'spares',
      packageType: 'CMMS'
    },
    {
      label: 'Suppliers Management',
      path: '/suppliers',
      icon: <Briefcase size={20} />,
      moduleId: 'suppliers',
      packageType: 'CMMS'
    },
    {
      label: 'Work Orders',
      path: '/work-orders',
      icon: <ClipboardList size={20} />,
      moduleId: 'work_orders',
      packageType: 'CMMS'
    },
    {
      label: 'Schedule Maintenance',
      path: '/schedules',
      icon: <Calendar size={20} />,
      moduleId: 'schedules',
      packageType: 'CMMS'
    },
    {
      label: 'HYPN System',
      icon: <Droplet size={20} />,
      packageType: 'IOT',
      children: [
        {
          label: 'Societies',
          path: '/societies',
          icon: <Building2 size={16} />,
          moduleId: 'dashboard',
          packageType: 'IOT'
        },
        {
          label: 'Alerts',
          path: '/devices',
          icon: <AlertCircle size={16} />,
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
          className={`relative group flex items-center transition-all duration-150 focus:outline-none cursor-pointer rounded-lg ${
            isExpanded 
              ? 'w-full h-[38px] px-2.5 justify-between' 
              : 'w-10 h-10 mx-auto justify-center'
          } ${
            isCurrentActive
              ? 'bg-blue-50/90 text-blue-700 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
          } ${
            isCurrentActive
              ? isExpanded
                ? 'before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-blue-600 before:rounded-r-md'
                : 'before:absolute before:left-0.5 before:top-2 before:bottom-2 before:w-[3px] before:bg-blue-600 before:rounded-r-md'
              : ''
          }`}
          title={!isExpanded ? item.label : undefined}
        >
          <div className={`flex items-center ${isExpanded ? 'w-full min-w-0' : 'justify-center'} z-10`}>
            <span className={`shrink-0 transition-colors ${
              isCurrentActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
            }`}>
              {item.icon}
            </span>
            
            {isExpanded && (
              <span className={`${level > 0 ? 'text-[12px]' : 'text-[13px]'} tracking-tight ml-2.5 flex-1 text-left truncate transition-colors ${
                isCurrentActive ? 'text-blue-950 font-semibold' : 'text-slate-600 group-hover:text-slate-900'
              }`}>
                {item.label}
              </span>
            )}

            {isExpanded && item.isComingSoon && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded ml-1.5 shrink-0">
                Soon
              </span>
            )}
            
            {isExpanded && hasChildren && (
              <span className={`transition-transform duration-200 text-slate-400 group-hover:text-slate-600 ml-1.5 shrink-0 ${isMenuExpanded ? 'rotate-180' : ''}`}>
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
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="ml-3.5 pl-2.5 border-l border-slate-200/80 flex flex-col mt-0.5 space-y-0.5">
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
                        className={`h-[32px] px-2 rounded-md flex items-center justify-between text-[12px] transition-all cursor-pointer relative group ${
                          isChildActive
                            ? 'bg-blue-50 text-blue-700 font-semibold before:absolute before:-left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-blue-600'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={isChildActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}>
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
      <aside className={`hidden sm:flex flex-col bg-white border-r border-slate-200/90 transition-all duration-300 ease-in-out h-full shrink-0 relative z-50 select-none shadow-xs print:hidden ${isExpanded ? 'w-[240px]' : 'w-[68px]'}`}>
        
        {/* Toggle Expand Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-[18px] w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:shadow-xs transition-all duration-150 z-50 shadow-xs cursor-pointer"
          title={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isExpanded ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
        </button>

        {/* Logo Section */}
        <div className={`flex items-center px-3.5 h-[56px] border-b border-slate-100 shrink-0 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
          <img 
            src={logo4m} 
            alt="4M Logo" 
            className={isExpanded ? "h-9 w-auto max-w-[130px] object-contain" : "h-7 w-auto object-contain"} 
          />
          {isExpanded && (
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md">
              CMMS
            </span>
          )}
        </div>

        {/* Navigation Accordions */}
        <div className="flex-1 flex flex-col p-2 overflow-y-auto space-y-0.5 custom-scrollbar">
          {filteredMenuData.map(item => renderMenuItem(item))}
        </div>

        {/* User Profile Section */}
        <div className="p-2.5 border-t border-slate-200/80 bg-slate-50/50 relative shrink-0">
          <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center flex-col gap-3'}`}>
            <div 
              className={`flex items-center gap-2.5 cursor-pointer hover:bg-white p-1.5 rounded-lg border border-transparent hover:border-slate-200/80 transition-all relative ${!isExpanded ? 'p-0 hover:bg-transparent hover:border-transparent' : 'flex-1 min-w-0 mr-1.5'}`}
              onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                {user.firstName ? user.firstName.charAt(0).toUpperCase() : (user.username ? user.username.charAt(0).toUpperCase() : 'U')}
              </div>
              
              {isExpanded && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-800 truncate leading-tight">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username || 'Admin User'}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium truncate mt-0.5">
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
                      className={`absolute bottom-[calc(100%+8px)] ${isExpanded ? 'left-0' : 'left-full ml-3'} w-60 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 cursor-default`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0 border border-white/30 font-bold text-sm">
                            {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate">
                              {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username || 'Admin User'}
                            </span>
                            <span className="text-[11px] text-blue-100 truncate">{user.email || user.username}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        <button 
                          onClick={() => {
                            setIsProfilePopupOpen(false);
                            setIsChangePasswordModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Key size={14} className="text-slate-400" />
                          Change Password
                        </button>
                        <button 
                          onClick={() => {
                            setIsProfilePopupOpen(false);
                            setIsModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <LogOut size={14} className="text-rose-500" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {isExpanded ? (
              <div className="flex items-center gap-1 shrink-0">
                <NotificationBell isExpanded={isExpanded} />
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 items-center">
                <NotificationBell isExpanded={isExpanded} />
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-2.5 right-3.5 sm:hidden z-[60] w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:text-blue-600 shadow-xs cursor-pointer"
      >
        {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
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
              className="fixed inset-y-0 left-0 w-[260px] bg-white z-[60] sm:hidden flex flex-col shadow-xl border-r border-slate-200"
            >
              {/* Logo Section */}
              <div className="flex items-center justify-between px-4 h-[56px] border-b border-slate-100">
                <img src={logo4m} alt="4M Logo" className="h-8 w-auto object-contain" />
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md">
                  CMMS
                </span>
              </div>

              {/* Navigation Accordions */}
              <div className="flex-1 flex flex-col p-2 overflow-y-auto space-y-0.5 custom-scrollbar">
                {filteredMenuData.map(item => renderMenuItem(item))}
              </div>

              {/* User Profile Section */}
              <div className="p-3 border-t border-slate-200/80 bg-slate-50/60">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-white p-2 rounded-lg border border-slate-200/80 transition-colors"
                  onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0 font-bold text-xs">
                      {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username || 'Admin User'}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium truncate">
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
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-md transition-colors"
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
