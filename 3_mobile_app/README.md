# 📱 Mobile App (Ứng dụng Chỉ Huy)

Đây là thành phần then chốt giúp bạn nắm giữ quyền lực tối thượng đối với chiếc Laptop từ xa.

## 🛠️ Định hướng Công nghệ
- **Nền tảng:** React Native (Expo).
- **Ngôn ngữ:** TypeScript.
- **Tính năng:**
  - `expo-camera`: Quét mã QR ghép nối.
  - `socket.io-client`: Kết nối realtime.
  - `crypto-js`: Giải mã AES từ PC.

## 🔐 Luồng thiết lập (Workflow)
1. **Quét QR:** Dùng Camera iPhone/Android quét mã QR trên màn hình PC.
2. **Giải mã:** App dùng khóa bí mật để lấy thông tin `deviceId` và `ServerUrl`.
3. **Kết nối:** Thiết lập đường truyền xác thực HMAC tới Cloud Relay.
4. **Chỉ huy:** Giao diện Dashboard hiện lên với các nút bấm "Nã pháo":
   - **LOCK:** Khóa máy ngay lập tức.
   - **LOCATE:** Xem vị trí và SSID mạng Laptop đang dùng.
   - **PHOTO:** Nhận ảnh mai phục từ Camera.
