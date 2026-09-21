import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { AlertCircle, AlertTriangle, CheckCircle, Info, VolumeX } from 'lucide-react';
import type { RootState } from '../../store';
import { audioBuzzer } from '../../utils/audioBuzzer';

let socket: Socket | null = null;

export function AlertToastManager() {
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const token =
    accessToken ||
    (typeof window !== 'undefined'
      ? sessionStorage.getItem('token') || localStorage.getItem('token')
      : null);

  useEffect(() => {
    if (!token) return;

    // Connect to websocket to listen for global alerts
    socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('AlertToastManager connected to WS');
    });

    socket.on('device-alert', (alert: any) => {
      // Play synthesized industrial buzzer / beep sound
      audioBuzzer.playAlertSound(alert.type, alert.intensity || 1);

      // Determine toast style based on alert type
      let icon = <AlertCircle size={24} className="text-red-500 shrink-0" />;
      let style = { borderLeft: '4px solid #ef4444' };
      const isUrgent = alert.type === 'CRITICAL' || alert.type === 'EMERGENCY';
      
      if (alert.type === 'WARNING') {
        icon = <AlertTriangle size={24} className="text-amber-500 shrink-0" />;
        style = { borderLeft: '4px solid #f59e0b' };
      } else if (alert.type === 'INFO' || alert.type === 'NOTIFY') {
        icon = <Info size={24} className="text-blue-500 shrink-0" />;
        style = { borderLeft: '4px solid #3b82f6' };
      }

      toast((t) => (
        <div className="flex items-start gap-3 w-full">
          <div className="flex-shrink-0 mt-0.5">{icon}</div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{alert.type} ALERT</span>
              {isUrgent && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full animate-pulse">
                  Buzzer Active
                </span>
              )}
            </div>
            <span className="text-sm text-gray-600 mt-1">{alert.message}</span>
            <span className="text-xs text-gray-400 mt-1">Device: {alert.deviceId}</span>

            {isUrgent && (
              <div className="mt-2 pt-1 border-t border-gray-100">
                <button
                  onClick={() => {
                    audioBuzzer.stopAllSounds();
                    toast.dismiss(t.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-100/80 hover:bg-red-200/80 rounded-md transition-colors"
                >
                  <VolumeX size={14} />
                  Silence Buzzer
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (isUrgent) audioBuzzer.stopAllSounds();
              toast.dismiss(t.id);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            ✕
          </button>
        </div>
      ), {
        duration: isUrgent ? 45000 : 5000,
        position: 'top-right',
        style: {
          ...style,
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }
      });
    });

    socket.on('device-alert-resolved', (alert: any) => {
      audioBuzzer.stopAllSounds();
      audioBuzzer.playResolvedChime();

      toast.success(
        <div className="flex flex-col">
          <span className="font-bold">Alert Resolved</span>
          <span className="text-sm">{alert.message}</span>
          <span className="text-xs text-gray-500">Device: {alert.deviceId}</span>
        </div>, 
        {
          duration: 4000,
          position: 'top-right',
          icon: <CheckCircle size={24} className="text-green-500" />,
          style: { borderLeft: '4px solid #10b981', borderRadius: '12px' }
        }
      );
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token]);

  return null; // This component just manages side-effects (toasts + audio)
}
