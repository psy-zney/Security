# 🛡️ Security Core Project (Laptop Anti-Theft)

Dự án này là một hệ sinh thái bảo mật đa nền tảng, được thiết kế đặc biệt để bảo vệ và giám sát Laptop cá nhân (như dòng Lenovo LOQ). Hệ thống cho phép người dùng điều khiển thiết bị từ bất cứ đâu, với khả năng xuyên thủng các lớp ngụy trang và bảo mật dữ liệu tuyệt đối.

## 🎯 Mục đích dự án
Hệ thống ra đời với sứ mệnh **"Không bao giờ để mất Laptop lần thứ hai"**. 
Thay vì chỉ dựa vào các phần mềm theo dõi vị trí thông thường dễ bị vô hiệu hóa, Security Core Project đi sâu vào can thiệp hệ thống ở mức kernel (Windows Service) và sử dụng cơ chế liên lạc "Du kích" (Offline Queue) để đảm bảo lệnh luôn được thực thi ngay khi máy có kết nối Internet trở lại.

## 🦾 Khả năng cốt lõi (Capabilities)
- **Điều khiển 1-1:** Khóa máy, khởi động lại, hoặc thực thi lệnh OS ngay từ điện thoại.
- **Phá bỏ ngụy trang VPN:** Lấy dữ liệu hạ tầng mạng vật lý (SSID/BSSID) để định vị thực chất của Laptop.
- **Mai phục Camera:** Chế độ rình rập tự động - Chụp ảnh ngay khi nắp che Camera vật lý được mở ra.
- **Bảo mật tuyệt đối:** Giao thức HMAC-SHA256 chống Replay-attack và mã hóa AES-256 cho việc ghép nối thiết bị (QR Pairing).
- **Hàng đợi ngoại tuyến:** Lệnh từ Mobile luôn được lưu trữ trên Cloud và tự động nã xuống PC ngay khi PC sáng đèn.

## 📂 Cấu trúc dự án
Tài liệu hướng dẫn chi tiết cho từng thành phần (Vui lòng nhấn vào liên kết bên dưới):

1.  [**`1_windows_service/`**](file:///c:/Users/meoic/Desktop/Security/1_windows_service/README.md): Lõi thực thi bằng Rust (Chạy quyền SYSTEM).
2.  [**`2_pc_ui_app/`**](file:///c:/Users/meoic/Desktop/Security/2_pc_ui_app/README.md): Giao diện quản trị & Trạm sinh mã QR Pairing (Tauri + React).
3.  [**`3_mobile_app/`**](file:///c:/Users/meoic/Desktop/Security/3_mobile_app/README.md): Ứng dụng điều khiển trên iPhone/Android (React Native).
4.  [**`4_cloud_relay/`**](file:///c:/Users/meoic/Desktop/Security/4_cloud_relay/README.md): Máy chủ điều phối & Hàng đợi trung tâm (Node.js).

---
**Author:** zney (lequangkhanh295@gmail.com)
