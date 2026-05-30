require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
// Khóa bí mật (Pre-Shared Key) dùng chung cho cá nhân bạn. Chỉ lưu ở .env của Server và ở máy tính bạn/App điện thoại.
// Hacker dù bắt được gói tin cũng không thể có khóa này.
const SECRET_KEY = process.env.RELAY_SECRET_KEY;
if (!SECRET_KEY) {
  console.error("FATAL: RELAY_SECRET_KEY is not defined in .env file");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware xác thực HMAC-SHA256 có chống Replay-Attack
io.use((socket, next) => {
  // Lấy dữ liệu từ auth (JS Client) HOẶC từ headers/query (Rust Client)
  let timestamp = socket.handshake.auth?.timestamp || socket.handshake.headers['x-timestamp'] || socket.handshake.query?.timestamp;
  let signature = socket.handshake.auth?.signature || socket.handshake.headers['x-signature'] || socket.handshake.query?.signature;

  if (!timestamp || !signature) {
    return next(new Error('Authentication Error: Missing timestamp or signature'));
  }

  // 1. Kiểm tra thời gian: Chỉ chấp nhận nếu request được tạo ra trong vòng 60 giây gần đây.
  // Lớp bảo vệ bổ sung: Hacker không thể chép lại signature và gửi lại sau đó (Replay attack).
  const now = Date.now();
  if (Math.abs(now - parseInt(timestamp)) > 60 * 1000) {
    return next(new Error('Authentication Error: Token Expired or Invalid Timeout'));
  }

  // 2. Tạo một mã băm sha256 chuẩn để kiểm tra (so khớp chữ ký).
  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(timestamp.toString())
    .digest('hex');

  // Đề phòng lỗi độ dài khác nhau khi so khớp (tránh timing attack)
  if (signature.length === expectedSignature.length && 
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    next();
  } else {
    next(new Error('Authentication Error: Invalid Signature'));
  }
});

// Bộ nhớ đệm danh sách các lệnh chưa gửi được (vì PC đang offline)
// Cấu trúc: Map<deviceId, Array<{command, payload}>>
const messageQueue = new Map();

io.on('connection', (socket) => {
  console.log(`[+] Mới kết nối: ${socket.id}`);

  // Phân loại client (vd: type = 'pc_service', 'mobile_app', 'pc_ui')
  socket.on('register', (data) => {
    const { type, deviceId } = data || {};
    socket.clientType = type || 'unknown';
    // Mặc định kết nối 1-1, bạn có thể tự quy định 1 chuẩn ID cho PC của bạn (vd: 'My_PC_001')
    socket.deviceId = deviceId;
    if (!socket.deviceId) {
       console.log(`[!] Cảnh báo: Client ${socket.id} kết nối không có deviceId.`);
       return socket.disconnect();
    }
    
    // Đưa kết nối vào một "phòng" riêng cho thiết bị đó, để dễ gửi lệnh 1-1
    socket.join(socket.deviceId);
    console.log(`[i] Đã đăng ký Client [${socket.id}] - Loại: ${socket.clientType} - Thiết bị: ${socket.deviceId}`);
    
    // Xả hàng chờ nếu đây là PC vừa bật lên lại và trước đó có Mobile gửi lệnh
    if (socket.clientType === 'pc_service') {
      const pendingCommands = messageQueue.get(socket.deviceId) || [];
      if (pendingCommands.length > 0) {
        console.log(`[+] Đang xả ${pendingCommands.length} lệnh tồn đọng (Offline Queue) cho thiết bị ${socket.deviceId}`);
        for (const cmd of pendingCommands) {
          socket.emit('execute_command', cmd);
        }
        // Xoá queue sau khi đã xả xong
        messageQueue.delete(socket.deviceId);
      }
    }
    
    socket.emit('registered', { status: 'success', deviceId: socket.deviceId });
  });

  // Mobile App gửi lệnh yêu cầu can thiệp tới PC
  socket.on('command_to_pc', (data) => {
    const { deviceId, command, payload } = data;
    
    // Kiểm tra xem hiện máy tính PC đó có đang online trong phòng không
    const room = io.sockets.adapter.rooms.get(deviceId);
    let isPcOnline = false;
    if (room) {
      for (const clientId of room) {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (clientSocket && clientSocket.clientType === 'pc_service') {
          isPcOnline = true;
          break;
        }
      }
    }

    if (isPcOnline) {
      console.log(`[*] PC đang Online. Trực tiếp chuyển tiếp lệnh '${command}' tới thiết bị '${deviceId}'`);
      io.to(deviceId).emit('execute_command', { command, payload });
    } else {
      console.log(`[!] PC '${deviceId}' đang Offline. Tự động lưu lệnh '${command}' vào Hàng đợi (Queue).`);
      
      // Khởi tạo queue nếu chưa có
      if (!messageQueue.has(deviceId)) {
        messageQueue.set(deviceId, []);
      }
      
      const q = messageQueue.get(deviceId);
      
      // KIỂM SOÁT RAM (MEMORY LEAK PREVENTION)
      // Dù PC có sập 1 năm, ta cũng chỉ lưu giữ tối đa 50 lệnh Mới Nhất để không gây Tràn RAM Máy chủ.
      if (q.length >= 50) {
        q.shift(); // Xoá lệnh cũ nhất ở đầu mảng đi
      }
      
      q.push({ 
        command, 
        payload, 
        queuedAt: Date.now() // (Option) Lưu thêm mốc thời gian để sau này tự huỷ lệnh quá 24h
      });
    }
  });

  // PC phản hồi lại trạng thái
  socket.on('status_update', (data) => {
    const { deviceId, status, message } = data;
    console.log(`[i] Báo cáo trạng thái từ thiết bị '${deviceId}': ${status}`);
    socket.to(deviceId).emit('status_update', data);
  });

  socket.on('disconnect', () => {
    console.log(`[-] Đã ngắt kết nối: ${socket.id} (Loại: ${socket.clientType})`);
  });
});

app.get('/', (req, res) => {
  // Trích xuất thống kê RAM thực tế của Node.js Server
  const memoryInfo = process.memoryUsage();
  
  res.json({
    status: 'Running',
    security: 'HMAC-SHA256',
    queueState: `Hiện có ${messageQueue.size} thiết bị đang có tin nhắn đọng.`,
    ramUsageMB: {
      rss: Math.round(memoryInfo.rss / 1024 / 1024) + ' MB (Tổng RAM vật lý dùng)',
      heapTotal: Math.round(memoryInfo.heapTotal / 1024 / 1024) + ' MB (Dung lượng V8 cấp phát)',
      heapUsed: Math.round(memoryInfo.heapUsed / 1024 / 1024) + ' MB (Nơi chứa MessageQueue thực tế)'
    }
  });
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 RELAY SERVER IS RUNNING ON PORT ${PORT}`);
  console.log(`🔐 SECURITY TIER: HMAC-SHA256`);
  console.log(`=========================================`);
});
