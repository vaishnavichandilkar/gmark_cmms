import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Volume2, VolumeX, Play, Mail, Check, Sliders } from 'lucide-react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { api } from '../../lib/api';
import type { RootState } from '../../store';
import { audioBuzzer } from '../../utils/audioBuzzer';

let socket: Socket | null = null;

export function NotificationBell({ isExpanded }: { isExpanded: boolean }) {
  const navigate = useNavigate();
  const { isAuthenticated, accessToken } = useSelector((state: RootState) => state.auth);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(audioBuzzer.isMuted());

  useEffect(() => {
    const unsubscribe = audioBuzzer.subscribe((muted) => setIsMuted(muted));
    return () => unsubscribe();
  }, []);

  const handleAcknowledge = async (alertId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/alerts/${alertId}/acknowledge`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      audioBuzzer.stopAllSounds();
    } catch (err: any) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Fetch initial active alerts across all devices
    api.get('/alerts/active/all')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setAlerts(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load initial active alerts:', err);
      });

    socket = io('http://localhost:3002', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('device-alert', (alert: any) => {
      setAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)]);
    });

    socket.on('device-alert-escalated', (escalated: any) => {
      setAlerts((prev) => [escalated, ...prev.filter((a) => a.id !== escalated.id)]);
    });

    socket.on('device-alert-resolved', (alert: any) => {
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [isAuthenticated, accessToken]);

  const unreadCount = alerts.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors shrink-0 relative"
        title="Notifications"
      >
        <Bell size={13} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full shadow-sm animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isDropdownOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] pointer-events-none">
            <div 
              className="fixed inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-auto" 
              onClick={() => setIsDropdownOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                bottom: '56px',
                left: isExpanded ? '16px' : '72px',
              }}
              className="w-88 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[10000] pointer-events-auto flex flex-col max-h-[460px]"
            >
              <div className="p-3.5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-sm">Alerts ({unreadCount})</h3>
                  <button
                    onClick={() => audioBuzzer.toggleMute()}
                    className={`p-1 rounded-md transition-colors ${
                      isMuted
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-gray-200/60 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={isMuted ? 'Sound Muted (Click to Unmute)' : 'Sound Enabled (Click to Mute)'}
                  >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (audioBuzzer.isBuzzerActive()) {
                        audioBuzzer.stopAllSounds();
                      } else {
                        audioBuzzer.playEmergencyBuzzer(3);
                      }
                    }}
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border transition-colors ${
                      audioBuzzer.isBuzzerActive()
                        ? 'text-red-700 bg-red-100 hover:bg-red-200 border-red-300 animate-pulse'
                        : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                    }`}
                    title={audioBuzzer.isBuzzerActive() ? 'Stop ringing buzzer' : 'Test emergency buzzer sound'}
                  >
                    <Play size={10} /> {audioBuzzer.isBuzzerActive() ? 'Stop Buzzer' : 'Test Buzzer'}
                  </button>
                  <button onClick={() => setIsDropdownOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-2 flex-1">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No active alerts.</div>
                ) : (
                  alerts.map((alert) => {
                    const isWarning = alert.type === 'WARNING';
                    const isNotify = alert.type === 'NOTIFY' || alert.type === 'INFO';
                    const badgeBg = isWarning
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : isNotify
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-red-50 border-red-200 text-red-700';

                    return (
                      <div
                        key={alert.id}
                        className={`p-3 mb-1.5 rounded-xl border flex flex-col gap-1 ${
                          isWarning
                            ? 'bg-amber-50/40 border-amber-100'
                            : isNotify
                            ? 'bg-blue-50/40 border-blue-100'
                            : 'bg-red-50/40 border-red-100'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${badgeBg}`}
                            >
                              {alert.type}
                              {alert.intensity ? ` (Lvl ${alert.intensity})` : ''}
                            </span>
                            {alert.escalationLevel > 1 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-tight">
                                Tier {alert.escalationLevel}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(alert.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 font-medium">{alert.message}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[11px] text-gray-500 font-mono">
                            Device: {alert.deviceId}
                          </span>
                          {alert.emailSent && (
                            <span
                              className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium"
                              title={`Roles: ${alert.rolesNotified || 'Custom'} | Sent to: ${alert.emailSentTo || 'subscribers'}`}
                            >
                              <Mail size={10} /> Email ({alert.rolesNotified || 'Sent'})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-gray-100">
                          <span className="text-[10px] text-gray-400 font-medium">
                            {alert.escalationLevel > 1 ? `Escalated to Tier ${alert.escalationLevel}` : 'Active Incident'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleAcknowledge(alert.id, e)}
                            className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Acknowledge alarm to resolve and stop further escalation"
                          >
                            <Check size={11} /> Acknowledge
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer link to Notification Settings */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">CMMS Alert Matrix</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/profile?tab=notifications');
                  }}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <Sliders size={12} />
                  <span>Notification Settings →</span>
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
