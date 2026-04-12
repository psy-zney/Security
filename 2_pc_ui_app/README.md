# 🎨 PC UI App (Giao diện Quản trị Desktop)

Ứng dụng này là bộ não điều hành tại chỗ, giúp người dùng đăng nhập và thiết lập uỷ quyền cho thiết bị di động.

## 🛠️ Công nghệ sử dụng
- **Khung xương:** Tauri (Rust-based WebView).
- **Giao diện:** ReactJS + TypeScript.
- **Mã hoá:** `crypto-js` (AES-256).
- **Mã vạch:** `react-qr-code`.

## 🚀 Tính năng Chi tiết

### 1. Đăng nhập Admin
- Chặn mọi truy cập trái phép bằng màn hình Login Admin.
- Sử dụng cơ chế Glassmorphism (Kính mờ) tạo cảm giác an toàn và hiện đại.

### 2. Ghép nối An toàn (Secure Pairing)
- Tạo ra một mã QR Code chứa thông tin cấu hình phức tạp.
- **Bảo mật:** Toàn bộ dữ liệu trong QR đã được mã hoá bằng khóa `MOBILE_APP_DECRYPT_KEY` qua thuật toán AES. 
- Ngay cả khi kẻ gian chụp trộm được mã QR, chúng cũng không thể giải mã để lấy được thông tin kết nối nếu không có ứng dụng di động chính chủ.

### 3. Build & Run
1. `npm install`
2. `npm run tauri dev`
