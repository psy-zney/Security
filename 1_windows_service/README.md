# ⚙️ Windows Service (Lõi thực thi Rust)

Thư mục này chứa mã nguồn của "Trạm Gác" chính - Một ứng dụng Rust được biên dịch thành Service chạy ngầm dưới quyền cao nhất của hệ điều hành Windows.

## 🛠️ Công nghệ sử dụng
- **Ngôn ngữ:** Rust (An toàn bộ nhớ, tốc độ Native).
- **Thư viện chính:**
  - `rust-socketio`: Giao tiếp thời gian thực với Cloud.
  - `tokio`: Runtime xử lý bất đồng bộ (Async).
  - `hmac` & `sha2`: Mã hóa chữ ký xác thực.
  - `escapi`: Tương tác với phần cứng Camera.
  - `reqwest`: Lấy thông tin IP/Location.

## 🚀 Tính năng Chi tiết

### 1. Xác thực HMAC-SHA256
Mỗi khi kết nối, Service sẽ:
- Lấy `SystemTime` hiện tại làm `timestamp`.
- Dùng `SECRET_KEY` băm `timestamp` để tạo `signature`.
- Gửi lên Server để đối soát. Nếu sai lệch quá 60 giây hoặc chữ ký sai -> Server lập tức ngắt mạng.

### 2. Định vị lách VPN (VPN-Buster)
Thay vì chỉ lấy IP (dễ bị VPN đánh lừa), Service thực hiện:
- Gọi lệnh hệ thống `netsh wlan show interfaces`.
- Trích xuất **SSID** (Tên Wifi) và **BSSID** (Địa chỉ Mac Router).
- Trích xuất IP Public thực tế.

### 3. Vòng lặp Mai phục Camera
- Khi có lệnh `capture_camera` từ điện thoại:
- Nếu thấy Camera bị gạt nút vật lý, một luồng (thread) rình rập sẽ được kích hoạt.
- Nó kiểm tra mỗi 3 giây; ngay khi Camera có điện trở lại (trộm gạt nắp), nó sẽ chớp ảnh ngay lập tức.

## 🔨 Cách sử dụng
1. `cargo check` để kiểm tra lỗi.
2. `cargo build --release` để đóng gói file chạy.
3. Cài đặt làm dịch vụ hệ thống bằng lệnh `sc create`.
