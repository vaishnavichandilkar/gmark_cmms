import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Mail, Smartphone } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

interface NotificationSettings {
  workOrders: { inApp: boolean; email: boolean };
  schedules: { inApp: boolean; email: boolean };
  preventiveMaintenance: { inApp: boolean; email: boolean };
  breakdownDowntime: { inApp: boolean; email: boolean };
  approvals: { inApp: boolean; email: boolean };
  systemAnnouncements: { inApp: boolean; email: boolean };
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationSettings>({
    workOrders: { inApp: true, email: true },
    schedules: { inApp: true, email: true },
    preventiveMaintenance: { inApp: true, email: false },
    breakdownDowntime: { inApp: true, email: true },
    approvals: { inApp: true, email: true },
    systemAnnouncements: { inApp: true, email: false },
  });

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    api.get('/api/v1/profile/me')
      .then((res) => {
        if (!mounted) return;
        const prefs = res.data?.preferences?.notificationPrefs;
        if (prefs) {
          setNotificationPrefs((prev) => ({
            ...prev,
            ...prefs,
          }));
        }
      })
      .catch(() => {
        // Fallback or offline default
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const handleToggle = async (key: keyof NotificationSettings, channel: 'inApp' | 'email') => {
    const updated = {
      ...notificationPrefs,
      [key]: {
        ...notificationPrefs[key],
        [channel]: !notificationPrefs[key][channel],
      },
    };
    setNotificationPrefs(updated);

    try {
      await api.patch('/api/v1/profile/preferences', {
        notificationPrefs: updated,
      }).catch(async () => {
        return await api.patch('/profile/preferences', {
          notificationPrefs: updated,
        });
      });
      toast.success('Notification settings saved', { id: 'notif-saved-toast' });
    } catch (err) {
      toast.error('Failed to update notification settings');
    }
  };

  if (!isOpen) return null;

  const rows = [
    {
      key: 'workOrders' as keyof NotificationSettings,
      title: 'Work Order Assignments',
      desc: 'Notifications when new work orders are assigned to your profile or department',
    },
    {
      key: 'schedules' as keyof NotificationSettings,
      title: 'Maintenance Schedule Reminders',
      desc: 'Upcoming routine, calibration, and statutory maintenance milestones',
    },
    {
      key: 'preventiveMaintenance' as keyof NotificationSettings,
      title: 'Preventive Maintenance (PM) Due Alerts',
      desc: 'Alerts for impending PM checklist target dates and overdue milestones',
    },
    {
      key: 'breakdownDowntime' as keyof NotificationSettings,
      title: 'Breakdown & Machine Downtime Alerts',
      desc: 'Critical alerts triggered by machine stoppages or SCADA threshold breaches',
    },
    {
      key: 'approvals' as keyof NotificationSettings,
      title: 'Approval Requests & Sign-offs',
      desc: 'Notifications when work order completions or spares requests need approval',
    },
    {
      key: 'systemAnnouncements' as keyof NotificationSettings,
      title: 'System & Plant Announcements',
      desc: 'Platform updates, maintenance advisories, and administrative plant notices',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-10 overflow-hidden border border-slate-200/80 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#15803D] border border-emerald-200/60 flex items-center justify-center">
                <Bell size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Notification Settings
                </h2>
                <p className="text-[11px] text-slate-500">
                  Configure alerts and dispatch channels for CMMS triggers
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Table Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading preferences...</span>
              </div>
            ) : (
              <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70">
                      <th className="py-2.5 px-4 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                        Industrial Event Trigger
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-bold tracking-wider text-slate-600 uppercase text-center w-28">
                        <span className="flex items-center justify-center gap-1">
                          <Smartphone size={13} className="text-slate-400" />
                          <span>In-App</span>
                        </span>
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-bold tracking-wider text-slate-600 uppercase text-center w-28">
                        <span className="flex items-center justify-center gap-1">
                          <Mail size={13} className="text-slate-400" />
                          <span>Email</span>
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {rows.map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block text-xs">
                            {row.title}
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5 block leading-normal">
                            {row.desc}
                          </span>
                        </td>

                        {/* In-App Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={notificationPrefs[row.key]?.inApp ?? true}
                            onClick={() => handleToggle(row.key, 'inApp')}
                            className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                              (notificationPrefs[row.key]?.inApp ?? true)
                                ? 'bg-[#15803D]'
                                : 'bg-slate-300'
                            }`}
                            title={`Toggle in-app alert for ${row.title}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                (notificationPrefs[row.key]?.inApp ?? true)
                                  ? 'translate-x-5'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Email Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={notificationPrefs[row.key]?.email ?? false}
                            onClick={() => handleToggle(row.key, 'email')}
                            className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                              (notificationPrefs[row.key]?.email ?? false)
                                ? 'bg-[#15803D]'
                                : 'bg-slate-300'
                            }`}
                            title={`Toggle email dispatch for ${row.title}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                (notificationPrefs[row.key]?.email ?? false)
                                  ? 'translate-x-5'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
              <Check size={14} /> Auto-saved to account profile
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

