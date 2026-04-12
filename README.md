# 🛡️ Hệ thống An ninh và Giám sát Từ xa (Security Core Project)

Dự án này là hệ thống bảo mật đa nền tảng tập trung vào khả năng can thiệp, giám sát và bảo vệ Laptop (đặc biệt là chống trộm cho các dòng như Lenovo LOQ). Hệ thống sử dụng kiến trúc phân tán từ Service cấp thấp cho tới Cloud Relay bảo mật HMAC-SHA256.

## 📂 Kiến trúc Hệ thống & Tính năng Đã triển khai

### 1. `1_windows_service/` (Lõi Bảo mật & Định vị - Rust)
- **Nhiệm vụ:** Chạy ngầm quyền **SYSTEM**, là "nằm vùng" thực hiện lệnh.
- **Tính năng đặc biệt:**
  - **Mã hóa HMAC-SHA256:** Tự động ký chữ ký số kèm Timestamp để xác thực với Server, chống Replay-Attack.
  - **VPN-Buster Tracking:** Tự động quét BSSID/SSID Wifi thực tế để định vị vị trí Laptop bất chấp kẻ trộm dùng VPN che dấu IP.
  - **Camera Ambush (Mai phục):** Nếu nắp che camera vật lý (E-Shutter) bị đóng, Service sẽ chạy vòng lặp rình rập và "cướp cò" chụp ảnh ngay giây đầu tiên kẻ trộm mở nắp camera.
  - **Can thiệp OS:** Khóa máy (LockWorkStation), đổi mật khẩu cấp tốc.

### 2. `2_pc_ui_app/` (Giao diện Quản trị & Ghép nối - Tauri + React)
- **Nhiệm vụ:** Thiết lập và cấp quyền cho điện thoại.
- **Tính năng:**
  - **Admin Login:** Bảo mật bằng mật khẩu quản trị cục bộ.
  - **QR Pairing (AES Encrypted):** Sinh mã QR chứa Payload (DeviceID, Cloud URL) đã được mã hóa **AES-256** để chỉ App Mobile "chính chủ" mới có thể giải mã và kết nối.
  - **Giao diện Glassmorphism:** Thiết kế hiện đại, mờ ảo và tối giản.

### 3. `4_cloud_relay/` (Trạm Trung chuyển Bảo mật - Node.js + Socket.io)
- **Nhiệm vụ:** Cầu nối điều khiển từ xa giữa Mobile và PC.
- **Tính năng:**
  - **Xác thực Chữ ký:** Chỉ cho phép các Client có đúng Secret Key và Timestamp hợp lệ kết nối.
  - **Offline Queue (Hàng đợi ngoại tuyến):** Nếu Laptop mất mạng, mọi lệnh từ Mobile (như Khóa máy) sẽ được lưu vào RAM Server. Ngay khi Laptop có mạng trở lại, lệnh sẽ được "xả" xuống thực thi ngay lập tức.
  - **Monitor API:** Cung cấp endpoint `/` để theo dõi tình trạng ngốn RAM và số lượng thiết bị đang kết nối thời gian thực.

### 4. `3_mobile_app/` (Ứng dụng Chỉ huy)
- *(Đang trong quá trình khởi tạo - Kiến trúc React Native).*

---

## 🛠️ Cài đặt & Khởi chạy

### 1. Chuẩn bị môi trường
- **Rust:** Cài đặt qua [rustup.rs](https://rustup.rs/) (Yêu cầu C++ Build Tools).
- **Node.js:** Bản LTS mới nhất.
- **Tauri:** Cài đặt WebView2 nếu là Windows đời cũ.

### 2. Khởi chạy Cloud Relay (Server)
```bash
cd 4_cloud_relay
npm install
npm run dev
```

### 3. Khởi chạy PC UI
```bash
cd 2_pc_ui_app
npm install
npm run tauri dev
```

### 4. Biên dịch Windows Service
```bash
cd 1_windows_service
cargo build --release
```

---

## 🔐 Cơ chế An ninh (Security Tier)
- **Truyền tin:** Socket.io trên nền tảng xác thực HMAC SHA-256.
- **Dữ liệu QR:** JSON String -> CryptoJS AES-256 -> QR Code.
- **Bảo vệ RAM:** Server giới hạn tối đa 50 lệnh chờ cho mỗi thiết bị để chống tràn bộ nhớ (Memory Leak Prevention).

---
⚠️ **Lưu ý:** Dự án đang trong giai đoạn phát triển (Development). Secret Key hiện đang để mặc định là `my_secure_key_123` trong code mẫu, hãy thay đổi trước khi triển khai thực tế.

**Phát triển bởi:** zney (lequangkhanh295@gmail.com)
