import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMqttStore } from '../store/useMqttStore';
import type { MqttPayload } from '../store/useMqttStore';

const SOCKET_SERVER_URL = 'http://localhost:3000';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { setConnectionStatus, updateData } = useMqttStore();

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setConnectionStatus(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setConnectionStatus(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setConnectionStatus(false);
    });

    newSocket.on('device-data', (data: MqttPayload | string) => {
      try {
        const payload = typeof data === 'string' ? JSON.parse(data) : data;
        updateData(payload);
      } catch (err) {
        console.error('Failed to parse device data:', err);
      }
    });

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('device-data');
      newSocket.close();
    };
  }, [setConnectionStatus, updateData]);

  return socket;
};
