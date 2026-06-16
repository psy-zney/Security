import { io, Socket } from 'socket.io-client';
import { generateHmacSignature } from './crypto';

let socket: Socket | null = null;
let currentDeviceId: string = '';

export function connectToRelay(
  serverUrl: string,
  secretKey: string,
  deviceId: string,
  onStatusUpdate: (data: any) => void,
  onDisconnect: () => void
): Socket {
  if (socket?.connected) {
    socket.disconnect();
  }

  const { timestamp, signature } = generateHmacSignature(secretKey);
  currentDeviceId = deviceId;

  socket = io(`${serverUrl}/?clientType=mobile_app&deviceId=${deviceId}&timestamp=${timestamp}&signature=${signature}`, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Kết nối thành công:', socket?.id);
    socket?.emit('register', {
      type: 'mobile_app',
      deviceId,
    });
  });

  socket.on('status_update', (data: any) => {
    const logData = { ...data };
    if (logData.image) {
      logData.image = '[BASE64_IMAGE_DATA_REMOVED_FROM_LOG]';
    }
    console.log('[Socket] Nhận status_update:', logData);
    onStatusUpdate(data);
  });

  socket.on('registered', (data: any) => {
    console.log('[Socket] Đăng ký thành công:', data);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Ngắt kết nối');
    onDisconnect();
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Lỗi kết nối:', err.message);
  });

  return socket;
}

export function sendCommand(command: string, payload: Record<string, any> = {}) {
  if (!socket?.connected) {
    console.warn('[Socket] Chưa kết nối, không thể gửi lệnh');
    return false;
  }
  socket.emit('command_to_pc', {
    deviceId: currentDeviceId,
    command,
    payload,
  });
  return true;
}

export function disconnectRelay() {
  socket?.disconnect();
  socket = null;
}

export function isConnected() {
  return socket?.connected ?? false;
}
