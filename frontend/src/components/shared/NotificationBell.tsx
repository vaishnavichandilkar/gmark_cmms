import { useState, useEffect } from 'react';
import { Bell, X, Volume2, VolumeX, Play } from 'lucide-react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { api } from '../../lib/api';
import type { RootState } from '../../store';
import { audioBuzzer } from '../../utils/audioBuzzer';

let socket: Socket | null = null;

export function NotificationBell({ isExpanded }: { isExpanded: boolean }) {
  const { isAuthenticated, accessToken } = useSelector((state: RootState) => state.auth);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(audioBuzzer.isMuted());

  useEffect(() => {
    const unsubscribe = audioBuzzer.subscribe((muted) => setIsMuted(muted));
    return () => unsubscribe();
  }, []);

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

    socket = io('http://localhost:3001', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('device-alert', (alert: any) => {
      setAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)]);
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
        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors shrink-0 relative"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full shadow-sm animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`absolute bottom-[calc(100%+10px)] ${isExpanded ? 'left-[-120px]' : 'left-full ml-4'} w-84 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50`}
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
              <div className="max-h-64 overflow-y-auto p-2">
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
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${badgeBg}`}
                          >
                            {alert.type}
                            {alert.intensity ? ` (Lvl ${alert.intensity})` : ''}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(alert.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 font-medium">{alert.message}</p>
                        <span className="text-[11px] text-gray-500 font-mono">
                          Device: {alert.deviceId}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
