# 🛡️ Security Core Project (Advanced Anti-Theft System)

Dự án Security Core là một hệ sinh thái bảo mật đa nền tảng, được thiết kế để cung cấp khả năng giám sát, can thiệp và bảo vệ thiết bị Windows từ xa. Hệ thống tập trung vào tính toàn vẹn của dữ liệu, khả năng định vị thực tế và cơ chế thực thi lệnh ngoại tuyến.

## 🎯 Mục tiêu dự án
Xây dựng một giải pháp an ninh chủ động cho các thiết bị di động (Laptop), cho phép người sở hữu duy trì quyền kiểm soát tuyệt đối ngay cả khi thiết bị đã bị chiếm quyền truy cập vật lý. Hệ thống tập trung vào việc vượt qua các lớp ngụy trang mạng và đảm bảo khả năng phản ứng tức thì thông qua mạng lưới Relay trung gian.

## 🦾 Khả năng cốt lõi (Core Capabilities)
- **Điều khiển thời gian thực:** Quản lý thiết bị qua giao thức WebSockets bảo mật.
- **Định vị hạ tầng vật lý:** Sử dụng kỹ thuật quét SSID/BSSID để xác định vị trí thực chất của thiết bị, loại bỏ sự sai lệch do VPN hoặc Proxy gây ra.
- **Cơ chế Ambush Camera:** Hệ thống rình rập tự động, kích hoạt chụp ảnh ghi hình ngay khi camera phần cứng được kích hoạt.
- **Xác thực đa tầng:** Sử dụng mã hóa AES-256 cho việc ghép nối thiết bị và HMAC-SHA256 cho việc truyền tin.
- **Hàng đợi lệnh (Offline Queue):** Đảm bảo tính sẵn sàng của lệnh điều khiển bằng cơ chế lưu trữ đệm tại Relay Server.

## 📂 Danh mục các Module
Hệ thống được phân rã thành các thành phần chuyên biệt:

1.  [**`1_windows_service/`**](1_windows_service/README.md): Lõi thực thi mức hệ thống bằng Rust (SYSTEM privileges).
2.  [**`2_pc_ui_app/`**](2_pc_ui_app/README.md): Giao diện quản trị Desktop & Trạm sinh mã định danh (Tauri + React).
3.  [**`3_mobile_app/`**](3_mobile_app/README.md): Ứng dụng điều khiển trung tâm (React Native).
4.  [**`4_cloud_relay/`**](4_cloud_relay/README.md): Máy chủ điều phối lưu lượng & Hàng đợi lệnh (Node.js).

## 🔐 Bảo mật
- Toàn bộ các khóa bí mật (Secrets) được quản lý qua tệp môi trường `.env`.
- Mã nguồn không chứa thông tin định danh hay thông tin đăng nhập gán cứng.

---
**Author:** zney (lequangkhanh295@gmail.com)
