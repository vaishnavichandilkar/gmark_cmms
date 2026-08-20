import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { api } from '../../lib/api';
import type { RootState } from '../../store';

let socket: Socket | null = null;

export function NotificationBell({ isExpanded }: { isExpanded: boolean }) {
  const { isAuthenticated, accessToken, user } = useSelector((state: RootState) => state.auth);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Fetch initial active alerts across devices (for simplicity, we might just fetch the last 20 global active alerts)
    // Or we rely on WS for new ones. Let's fetch recent active alerts if possible.
    // For now, let's just maintain a session-based list of alerts from WS
    
    socket = io('http://localhost:3001', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('device-alert', (alert: any) => {
      setAlerts((prev) => [alert, ...prev]);
    });

    socket.on('device-alert-resolved', (alert: any) => {
      setAlerts((prev) => prev.filter(a => a.id !== alert.id));
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
              className={`absolute bottom-[calc(100%+10px)] ${isExpanded ? 'left-[-120px]' : 'left-full ml-4'} w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50`}
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Alerts ({unreadCount})</h3>
                <button onClick={() => setIsDropdownOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No active alerts.</div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className="p-3 mb-1 rounded-xl bg-red-50 border border-red-100 flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-red-600">{alert.type}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium">{alert.message}</p>
                      <span className="text-[11px] text-gray-500">Device: {alert.deviceId}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
