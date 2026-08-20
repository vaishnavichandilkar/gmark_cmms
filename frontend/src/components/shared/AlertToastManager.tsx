import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { RootState } from '../../store';

let socket: Socket | null = null;

export function AlertToastManager() {
  const { isAuthenticated, accessToken } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Connect to websocket to listen for global alerts
    socket = io('http://localhost:3001', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('AlertToastManager connected to WS');
    });

    socket.on('device-alert', (alert: any) => {
      // Determine toast style based on alert type
      let icon = <AlertCircle size={24} className="text-red-500" />;
      let style = { borderLeft: '4px solid #ef4444' };
      
      if (alert.type === 'WARNING') {
        icon = <AlertTriangle size={24} className="text-amber-500" />;
        style = { borderLeft: '4px solid #f59e0b' };
      } else if (alert.type === 'INFO') {
        icon = <Info size={24} className="text-blue-500" />;
        style = { borderLeft: '4px solid #3b82f6' };
      }

      toast((t) => (
        <div className="flex items-start gap-3 w-full">
          <div className="flex-shrink-0 mt-0.5">{icon}</div>
          <div className="flex flex-col flex-1">
            <span className="font-bold text-gray-900">{alert.type} ALERT</span>
            <span className="text-sm text-gray-600 mt-1">{alert.message}</span>
            <span className="text-xs text-gray-400 mt-2">Device: {alert.deviceId}</span>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
      ), {
        duration: alert.type === 'CRITICAL' ? 10000 : 5000,
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
  }, [isAuthenticated, accessToken]);

  return null; // This component just manages side-effects (toasts)
}
