# 📱 Mobile App — Security Command Center (iOS)

Ứng dụng điều khiển trung tâm dành riêng cho **iPhone (iOS)**. Được xây dựng bằng React Native (Expo SDK 52).

## 🛠️ Công nghệ
- **Nền tảng:** iOS (iPhone)
- **Framework:** React Native + Expo SDK 52
- **Ngôn ngữ:** TypeScript
- **Điều hướng:** Expo Router v4 (file-based routing)
- **Thư viện:**
  - `expo-camera`: Quét mã QR ghép nối.
  - `socket.io-client`: Kết nối WebSocket realtime với Cloud Relay.
  - `crypto-js`: Giải mã AES-256 từ payload QR + tạo chữ ký HMAC-SHA256.
  - `@react-native-async-storage`: Lưu thông tin Pairing bền vững trên máy.

## 🔐 Luồng hoạt động

```
[Khởi động] → Kiểm tra dữ liệu Pairing đã lưu
    ├── Chưa Pairing → Màn hình Welcome → Nhấn Quét QR
    │       → Giải mã AES payload → Lưu vào Storage
    │       → Kết nối Socket.io với HMAC Auth
    │       → Dashboard
    └── Đã Pairing → Dashboard trực tiếp (không cần quét lại)
```

## 📂 Cấu trúc

```
3_mobile_app/
├── app/
│   ├── _layout.tsx     # Root navigation
│   ├── index.tsx       # Màn hình Welcome / Splash
│   ├── scan.tsx        # Quét mã QR ghép nối
│   └── dashboard.tsx   # Trung tâm điều khiển
├── lib/
│   ├── crypto.ts       # Giải mã AES & chữ ký HMAC
│   ├── socket.ts       # Kết nối Socket.io Relay
│   └── storage.ts      # Lưu thông tin Pairing
├── app.json            # Cấu hình Expo (iOS only)
└── package.json
```

## 🚀 Chạy thử nhanh trên iPhone (Expo Go)

> Đây là cách nhanh nhất để test. Không cần Mac, không cần Xcode.

**Bước 1:** Tải **[Expo Go](https://apps.apple.com/app/expo-go/id982107779)** từ App Store trên iPhone.

**Bước 2:** Chạy lệnh trên máy tính:
```bash
cd 3_mobile_app
npm install
npx expo start
```

**Bước 3:** Mở Camera iPhone quét mã QR xuất hiện trong terminal → App tự động tải lên Expo Go.

## 🏗️ Build bản cài đặt chính thức (.ipa)

> Yêu cầu: Tài khoản Expo (miễn phí) + Tài khoản Apple Developer ($99/năm).

```bash
npm install -g eas-cli
eas login
eas build --platform ios
```

## ⚙️ Lưu ý Bảo mật

Giá trị `AES_PASSPHRASE` trong `app/scan.tsx` **phải khớp** với `VITE_AES_PASSPHRASE` trong tệp `.env` của `2_pc_ui_app`:

```typescript
// app/scan.tsx
const AES_PASSPHRASE = 'MOBILE_APP_DECRYPT_KEY'; // ← Đổi thành giá trị thật của bạn
```
