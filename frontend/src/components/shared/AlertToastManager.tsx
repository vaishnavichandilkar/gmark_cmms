import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { AlertCircle, AlertTriangle, CheckCircle, Info, VolumeX, Mail, Check, ArrowUpRight } from 'lucide-react';
import { api, API_BASE_URL } from '../../lib/api';
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

  const handleAcknowledgeAlert = async (alertId: number, toastId: string) => {
    try {
      audioBuzzer.stopAllSounds();
      toast.dismiss(toastId);
      await api.post(`/alerts/${alertId}/acknowledge`);
      toast.success(`Alert #${alertId} acknowledged. Escalation halted.`, {
        duration: 3000,
        position: 'top-right',
      });
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  useEffect(() => {
    if (!token) return;

    // Connect to websocket to listen for global alerts
    socket = io(API_BASE_URL, {
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
              {alert.escalationLevel && alert.escalationLevel > 1 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                  Tier {alert.escalationLevel}
                </span>
              )}
              {isUrgent && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full animate-pulse">
                  Buzzer Active
                </span>
              )}
            </div>
            <span className="text-sm text-gray-600 mt-1">{alert.message}</span>
            <span className="text-xs text-gray-400 mt-1">Device: {alert.deviceId}</span>

            {alert.emailSent && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mt-1.5 border border-blue-100 w-fit">
                <Mail size={11} className="shrink-0" />
                <span>
                  Email sent to {alert.rolesNotified ? `roles [${alert.rolesNotified}]` : (alert.emailSentTo ? alert.emailSentTo.split(',')[0] + (alert.emailSentTo.includes(',') ? ' +' : '') : 'subscribers')}
                </span>
              </span>
            )}

            <div className="flex items-center gap-2 mt-2 pt-1 border-t border-gray-100">
              {alert.id && (
                <button
                  onClick={() => handleAcknowledgeAlert(alert.id, t.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200/80 rounded-md transition-colors"
                >
                  <Check size={14} />
                  Acknowledge
                </button>
              )}
              {isUrgent && (
                <button
                  onClick={() => {
                    audioBuzzer.stopAllSounds();
                    toast.dismiss(t.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-100/80 hover:bg-red-200/80 rounded-md transition-colors"
                >
                  <VolumeX size={14} />
                  Silence
                </button>
              )}
            </div>
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

    socket.on('device-alert-escalated', (alert: any) => {
      // Escalated alert - synthesize high priority buzzer
      audioBuzzer.playAlertSound('CRITICAL', 2);

      toast((t) => (
        <div className="flex items-start gap-3 w-full">
          <div className="flex-shrink-0 mt-0.5">
            <ArrowUpRight size={24} className="text-purple-600 shrink-0 animate-bounce" />
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-purple-900">ESCALATED (Tier {alert.escalationLevel})</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full animate-pulse">
                To: {alert.escalatedToRole || 'Head'}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-800 mt-1">{alert.message}</span>
            <span className="text-xs text-gray-500 mt-0.5">
              Unacknowledged on Device: <span className="font-semibold">{alert.deviceId}</span>
            </span>

            {alert.emailSent && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md mt-1.5 border border-purple-100 w-fit">
                <Mail size={11} className="shrink-0" />
                <span>Escalated to role [{alert.escalatedToRole}]</span>
              </span>
            )}

            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-purple-100">
              {alert.id && (
                <button
                  onClick={() => handleAcknowledgeAlert(alert.id, t.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors shadow-sm"
                >
                  <Check size={13} />
                  Acknowledge & Halt
                </button>
              )}
              <button
                onClick={() => {
                  audioBuzzer.stopAllSounds();
                  toast.dismiss(t.id);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <VolumeX size={13} />
                Mute
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              audioBuzzer.stopAllSounds();
              toast.dismiss(t.id);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            ✕
          </button>
        </div>
      ), {
        duration: 60000,
        position: 'top-right',
        style: {
          borderLeft: '4px solid #9333ea',
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: '#faf5ff',
          boxShadow: '0 10px 25px -5px rgba(147, 51, 234, 0.2), 0 8px 10px -6px rgba(147, 51, 234, 0.1)',
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
