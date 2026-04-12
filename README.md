# 🛡️ Hệ thống An ninh và Giám sát Từ xa (Security Core Project)

Dự án này là hệ thống phần mềm đa nền tảng tập trung vào khả năng can thiệp, giám sát và bảo mật thiết bị (PC, Windows). Hệ thống đi từ cấp thấp nhất (Native Windows Service) cho tới giao diện người dùng trên PC, Mobile và cầu nối Cloud Relay.

## 📂 Tổ chức Thư mục & Nhiệm vụ

Hệ thống được chia thành 4 thành phần (mô-đun) định hướng chính:

1. **`1_windows_service/` (Lõi Bảo mật Windows - Rust)**
   - **Nhiệm vụ:** Là dịch vụ chạy ngầm trên Windows (Background Service) hoạt động bằng quyền hạn cao nhất (Administrator/SYSTEM). Service này chịu trách nhiệm trực tiếp thực thi các lệnh can thiệp nhạy cảm ở cấp OS như: Đổi mật khẩu, khóa thiết bị, vô hiệu hóa USB, can thiệp kết nối mạng, đọc tín hiệu Camera hoặc có thể tự hủy theo cơ chế định sẵn.
   - **Công nghệ:** Rust, kết hợp thư viện `winapi`, `windows-service`.

2. **`2_pc_ui_app/` (Giao diện Quản trị Desktop - Tauri + React)**
   - **Nhiệm vụ:** Là ứng dụng trực quan (Desktop App) dành cho quản trị viên/người dùng tương tác, kiểm tra trạng thái và cung cấp công cụ thử nghiệm các tính năng của `1_windows_service` một cách dễ dàng thông qua bảng điều khiển thay vì dùng dòng lệnh.
   - **Công nghệ:** Tauri (Rust backend), ReactJS + TypeScript (Frontend), Vanilla CSS (Giao diện Glassmorphism).

3. **`3_mobile_app/` (Ứng dụng Di động Kiểm soát Từ xa)*
   - **Nhiệm vụ:** Đóng vai trò thiết bị nhận thông báo và điều khiển di động (Remote control). Bất kể bạn ở đâu, các cảnh báo từ PC sẽ được đẩy về đây, cho phép bạn nhanh chóng có giải pháp xử lý kịp thời như gửi lệnh Khóa PC.
   - *(Dự kiến xây dựng trên Flutter - Dart).*

4. **`4_cloud_relay/` (Máy chủ Cầu nối Trung gian)*
   - **Nhiệm vụ:** Là Server kết nối và điều tiết lưu lượng giao tiếp giữa phần nền của máy tính (Windows Service) tới môi trường internet mở (Mobile App). Xây dựng cơ chế hàng đợi lệnh theo thời gian thực (WebSockets, gRPC).
   - *(Dự kiến lập trình bằng Node.js / Rust).*

---

## 🛠️ Công cụ và Tài nguyên cần cài đặt

Để clone dự án về máy ảo và bắt đầu ngay việc code & giả lập môi trường, bạn cần cài đặt các công cụ sau:

### 1. Cài đặt Ngôn ngữ lập trình Rust (Bắt buộc cho Windows Service & Tauri)
- **Link tải:** [https://rustup.rs/](https://rustup.rs/) (Tải bộ cài `rustup-init.exe`).
- **Lưu ý trên Windows:** Trong quá trình cài Rust, hệ thống sẽ đề nghị bạn cài đặt **C++ Build Tools** (bao gồm MSVC và Windows 11 SDK). Hãy nhấn đồng ý để nó tự động tải về vì điều này quyết định khả năng biên dịch được mã Native Windows.
- **Kiểm tra cài đặt:** `cargo -V`

### 2. Cài đặt Node.js & npm (Dành cho nền tảng Frontend)
- **Link tải:** [https://nodejs.org/](https://nodejs.org/) (Nên tải phiên bản khuyên dùng - LTS).
- Cần thiết để chạy các gói thư viện frontend UI của ứng dụng thứ 2 (`2_pc_ui_app`).
- **Kiểm tra cài đặt:** `npm -v`

### 3. Yêu cầu phụ của Tauri (Tauri Windows Prerequisites)
Nếu máy ảo bạn sử dụng là bản Windows 10/11 hiện đại, thường thì **WebView2 Runtime** đã được cài sẵn. Nếu hệ thống báo thiếu khi chạy thử `2_pc_ui_app`, bạn có thể theo dõi hướng dẫn [Setup chi tiết tại đây](https://tauri.app/v1/guides/getting-started/prerequisites#windows) để tải WebView2.

---

## 🚀 Các lệnh phát triển quan trọng (Cheatsheet)

Bạn hãy thực hiện các lệnh này ở hệ điều hành tại môi trường máy ảo nhé (Do chúng ta sẽ tác động trực tiếp vào OS Windows). Nên mở terminal dưới quyền **Administrator**.

### 👉 Dành cho Windows Service (`1_windows_service`):
```bash
# Di chuyển tới thư mục
cd 1_windows_service

# Kiểm tra lỗi trước khi build
cargo check

# Biên dịch chương trình (tạo ra file .exe trong thư mục target/release/)
cargo build --release
```

### 👉 Dành cho Desktop App (`2_pc_ui_app`):
```bash
# Di chuyển tới thư mục Frontend UI
cd 2_pc_ui_app

# Tải về tất cả thư viện cần thiết (Chỉ cần làm ở lần clone đầu)
npm install

# Khởi chạy giao diện môi trường lập trình (sẽ tự động bật cửa sổ App cho bạn trải nghiệm và có Hot-Reload code)
npm run tauri dev
```

---
⚠️ **Lưu ý Quan trọng:** Trong khi phát triển và chạy thử tính năng Khóa PC/Đổi Password, hãy thiết lập một tài khoản user nội bộ (Local User) có quyền Admin để test thay vì tài khoản Microsoft Account cá nhân đang liên kết email để tránh mất quyền đăng nhập vĩnh viễn trên máy ảo.
