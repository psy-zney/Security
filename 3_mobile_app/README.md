# 📱 Mobile App — Security Command Center

Ứng dụng điều khiển trung tâm chạy trên iOS/Android. Được xây dựng bằng React Native (Expo SDK 52).

## 🛠️ Công nghệ
- **Nền tảng:** React Native (Expo SDK 52)
- **Ngôn ngữ:** TypeScript
- **Điều hướng:** Expo Router v4 (file-based routing)
- **Thư viện:**
  - `expo-camera`: Quét mã QR ghép nối.
  - `socket.io-client`: Kết nối WebSocket realtime với Cloud Relay.
  - `crypto-js`: Giải mã AES-256 từ payload QR, tạo chữ ký HMAC-SHA256.
  - `@react-native-async-storage`: Lưu thông tin Pairing bền vững.

## 🔐 Luồng hoạt động

```
[Khởi động] → Kiểm tra dữ liệu Pairing đã lưu
    ├── Chưa Pairing → Màn hình Welcome → Quét QR
    │         → Giải mã AES payload → Lưu vào AsyncStorage
    │         → Kết nối Socket.io với HMAC auth
    │         → Dashboard
    └── Đã Pairing → Dashboard trực tiếp
```

## 📂 Cấu trúc thư mục

```
3_mobile_app/
├── app/
│   ├── _layout.tsx     # Root navigation layout
│   ├── index.tsx       # Màn hình Welcome / Splash
│   ├── scan.tsx        # Màn hình quét QR Code
│   └── dashboard.tsx   # Trung tâm Điều khiển chính
├── lib/
│   ├── crypto.ts       # Giải mã AES & tạo chữ ký HMAC
│   ├── socket.ts       # Quản lý kết nối Socket.io
│   └── storage.ts      # Lưu/đọc thông tin Pairing
├── app.json            # Cấu hình Expo
└── package.json
```

## 🚀 Khởi chạy

```bash
cd 3_mobile_app
npm install
npx expo start
```

Sau đó quét mã QR bằng app **Expo Go** trên iPhone/Android để xem thực tế.

## 📲 Build bản phát hành (EAS)

```bash
npx eas build --platform ios
npx eas build --platform android
```

> Yêu cầu tài khoản Expo (miễn phí) và EAS CLI.

## ⚙️ Cấu hình Bảo mật

Trước khi build phát hành, hãy thay đổi giá trị hằng số sau trong `app/scan.tsx`:

```typescript
const AES_PASSPHRASE = 'MOBILE_APP_DECRYPT_KEY';
// → Phải khớp 100% với VITE_AES_PASSPHRASE trong 2_pc_ui_app/.env
```
