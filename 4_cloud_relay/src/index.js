require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Import Mongoose Models
const Device = require('./models/Device');
const Command = require('./models/Command');
const ActivityLog = require('./models/ActivityLog');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/security_system';

// Kết nối MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('🍃 Connected to MongoDB successfully.'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

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

// Middleware xác thực động dựa vào MongoDB
io.use(async (socket, next) => {
  try {
    const query = socket.handshake.query || {};
    const clientType = query.clientType || socket.handshake.auth?.clientType || 'unknown';
    const deviceId = query.deviceId || socket.handshake.auth?.deviceId;

    if (!deviceId) {
      return next(new Error('Authentication Error: Missing deviceId'));
    }

    // 1. Nếu là PC Service kết nối: Đăng ký/Cập nhật khóa vào MongoDB
    if (clientType === 'pc_service') {
      const secretKey = query.secretKey;
      if (!secretKey) {
        return next(new Error('Authentication Error: Missing secretKey for PC service'));
      }
      
      // Upsert thiết bị trong MongoDB
      await Device.findOneAndUpdate(
        { deviceId },
        { secretKey, lastSeen: new Date() },
        { upsert: true, new: true }
      );
      
      console.log(`[i] PC Registered in MongoDB: ${deviceId}`);
      return next();
    }

    // 2. Nếu là các client khác (Mobile, UI): Xác thực bằng chữ ký HMAC
    const timestamp = query.timestamp || socket.handshake.auth?.timestamp;
    const signature = query.signature || socket.handshake.auth?.signature;

    if (!timestamp || !signature) {
      return next(new Error('Authentication Error: Missing timestamp or signature'));
    }

    // Chống Replay attack (hạn dùng 60s)
    const now = Date.now();
    if (Math.abs(now - parseInt(timestamp)) > 60 * 1000) {
      return next(new Error('Authentication Error: Token Expired or Invalid Timeout'));
    }

    // Lấy khóa bí mật tương ứng của thiết bị từ MongoDB
    const device = await Device.findOne({ deviceId });
    if (!device || !device.secretKey) {
      return next(new Error('Authentication Error: Device is not registered or offline'));
    }

    // So khớp chữ ký
    const expectedSignature = crypto
      .createHmac('sha256', device.secretKey)
      .update(timestamp.toString())
      .digest('hex');

    if (signature.length === expectedSignature.length && 
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      next();
    } else {
      next(new Error('Authentication Error: Invalid Signature'));
    }
  } catch (err) {
    console.error('Middleware Error:', err);
    next(new Error('Authentication Error: Internal Server Error'));
  }
});

io.on('connection', (socket) => {
  console.log(`[+] Mới kết nối: ${socket.id}`);

  // Phân loại client (vd: type = 'pc_service', 'mobile_app')
  socket.on('register', async (data) => {
    const { type, deviceId, location } = data || {};
    socket.clientType = type || 'unknown';
    socket.deviceId = deviceId;

    if (!socket.deviceId) {
       console.log(`[!] Cảnh báo: Client ${socket.id} kết nối không có deviceId.`);
       return socket.disconnect();
    }
    
    socket.join(socket.deviceId);
    console.log(`[i] Đã đăng ký Client [${socket.id}] - Loại: ${socket.clientType} - Thiết bị: ${socket.deviceId}`);
    
    // Nếu là PC Service: Xả hàng chờ lệnh từ MongoDB và lưu log online
    if (socket.clientType === 'pc_service') {
      try {
        // Cập nhật email chủ sở hữu nếu có trong gói tin đăng ký
        if (data.email) {
          await Device.findOneAndUpdate({ deviceId }, { ownerEmail: data.email });
        }

        // Tạo log thiết bị Online
        await ActivityLog.create({
          deviceId,
          message: 'Thiết bị bảo vệ đã trực tuyến (Online)',
          type: 'success'
        });

        // Tìm và gửi các lệnh tồn đọng từ DB
        const pendingCommands = await Command.find({ deviceId }).sort({ queuedAt: 1 });
        if (pendingCommands.length > 0) {
          console.log(`[+] Đang xả ${pendingCommands.length} lệnh tồn đọng cho thiết bị ${socket.deviceId}`);
          for (const cmd of pendingCommands) {
            socket.emit('execute_command', { command: cmd.command, payload: cmd.payload });
          }
          // Xóa hết lệnh đã xả
          await Command.deleteMany({ deviceId });
        }
      } catch (err) {
        console.error('Lỗi khi xả hàng đợi lệnh:', err);
      }
    }
    
    socket.emit('registered', { status: 'success', deviceId: socket.deviceId });
  });

  // Mobile App gửi lệnh yêu cầu can thiệp tới PC
  socket.on('command_to_pc', async (data) => {
    const { deviceId, command, payload } = data;
    
    // Kiểm tra xem hiện máy tính PC đó có đang online không
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
      console.log(`[*] PC đang Online. Chuyển trực tiếp lệnh '${command}' tới thiết bị '${deviceId}'`);
      io.to(deviceId).emit('execute_command', { command, payload });
    } else {
      console.log(`[!] PC '${deviceId}' đang Offline. Tự động lưu lệnh '${command}' vào MongoDB Queue.`);
      try {
        // Giới hạn hàng đợi tối đa 50 lệnh để phòng tránh spam
        const count = await Command.countDocuments({ deviceId });
        if (count >= 50) {
          // Xóa lệnh cũ nhất
          const oldest = await Command.findOne({ deviceId }).sort({ queuedAt: 1 });
          if (oldest) await Command.deleteOne({ _id: oldest._id });
        }

        // Tạo lệnh mới trong DB
        await Command.create({ deviceId, command, payload });
        
        // Lưu log Offline
        await ActivityLog.create({
          deviceId,
          message: `Xếp hàng đợi lệnh ngoại tuyến: ${command}`,
          type: 'info'
        });
      } catch (err) {
        console.error('Lỗi khi lưu lệnh vào MongoDB:', err);
      }
    }
  });

  // PC phản hồi lại trạng thái
  socket.on('status_update', async (data) => {
    const { deviceId, status, message, image } = data;
    console.log(`[i] Báo cáo trạng thái từ thiết bị '${deviceId}': ${status || message}`);
    
    // Phát ngược lại cho Mobile trong phòng
    socket.to(deviceId).emit('status_update', data);

    // Tự động lưu nhật ký hoạt động vào MongoDB
    try {
      const type = (status && status.toLowerCase().includes('lỗi')) ? 'error' : 
                   (status && (status.toLowerCase().includes('chụp') || status.toLowerCase().includes('cảnh báo'))) ? 'alarm' : 'info';
      
      await ActivityLog.create({
        deviceId,
        message: status || message || 'Báo cáo trạng thái',
        type,
        imageBase64: image || null
      });
    } catch (err) {
      console.error('Lỗi khi lưu nhật ký hoạt động:', err);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`[-] Đã ngắt kết nối: ${socket.id} (Loại: ${socket.clientType})`);
    if (socket.clientType === 'pc_service' && socket.deviceId) {
      try {
        // Lưu nhật ký PC ngoại tuyến
        await ActivityLog.create({
          deviceId: socket.deviceId,
          message: 'Thiết bị bảo vệ đã ngoại tuyến (Offline)',
          type: 'error'
        });
        
        await Device.findOneAndUpdate({ deviceId: socket.deviceId }, { lastSeen: new Date() });
      } catch (err) {
        console.error('Lỗi khi cập nhật PC offline:', err);
      }
    }
  });
});

// REST APIs để lấy thông tin log từ Mobile App
app.get('/api/logs/:deviceId', async (req, res) => {
  try {
    const logs = await ActivityLog.find({ deviceId: req.params.deviceId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/', async (req, res) => {
  const memoryInfo = process.memoryUsage();
  try {
    const deviceCount = await Device.countDocuments();
    const pendingCommands = await Command.countDocuments();
    res.json({
      status: 'Running',
      database: 'MongoDB (Mongoose)',
      stats: {
        devicesRegistered: deviceCount,
        offlineCommandsQueued: pendingCommands
      },
      ramUsageMB: {
        rss: Math.round(memoryInfo.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryInfo.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryInfo.heapUsed / 1024 / 1024) + ' MB'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'DB Connection Error' });
  }
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 RELAY SERVER IS RUNNING ON PORT ${PORT}`);
  console.log(`🔐 SECURITY TIER: MONGODB MULTI-TENANT`);
  console.log(`=========================================`);
});
