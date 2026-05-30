# ☁️ Cloud Relay (Máy chủ Trung gian)

Đây là "Trạm Bưu Điện" - Nơi điều phối mọi thông điệp bảo mật giữa thiết bị Di động và Máy tính.

## 🛠️ Công nghệ sử dụng
- **Runtime:** Node.js.
- **Thư viện:** Express, Socket.io, Crypto.
- **An ninh:** Local RAM Queue (Hàng đợi lưu trên RAM).

## 🚀 Tính năng Chi tiết

### 1. HMAC Auth Middleware
Toàn bộ mọi kết nối vào Server đều phải đi qua lớp "Cửa khẩu" kiểm soát:
- Kiểm tra tính hợp lệ của chữ ký (Signature).
- Kiểm tra hạn sử dụng của lệnh (Timestamp Validation - Chống trộm lại gói tin).

### 2. Offline Queue (Hàng đợi Ngoại tuyến)
- Khi lệnh điều khiển bay tới mà Laptop đang mất mạng, Server sẽ không vứt bỏ lệnh đó.
- Server tự tạo một kho lưu trữ tạm thời `messageQueue`.
- Ngay khi Laptop thò mặt lên (Event: `register`), Server sẽ **Xả toàn bộ lệnh tồn đọng** xuống Laptop.

### 3. RAM Monitoring
- Truy cập `GET /` để xem báo cáo chi tiết về tình trạng RAM hệ thống đang sử dụng (RSS, Heap).
- Giới hạn 50 tin nhắn chờ/thiết bị để tránh kẻ xấu tấn công gây tràn bộ nhớ Server.

## 🔨 Cách sử dụng
1. `npm install`
2. `npm run dev` (Khởi chạy bằng nodemon).
