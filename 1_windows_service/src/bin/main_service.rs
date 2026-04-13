// ============================================================
// main_service.rs - Service chính chạy ngầm trên Windows
// Lắng nghe lệnh từ App UI qua Named Pipe và Mobile qua Socket.io
// ============================================================

use security::ipc::named_pipe;
use security::system_ops::{password, usb_control, camera};

use std::ffi::OsString;
use std::time::Duration;
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    service_dispatcher,
};

use rust_socketio::{ClientBuilder, Payload};
use serde_json::json;
use std::time::{SystemTime, UNIX_EPOCH};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::sync::{Arc, mpsc};
use winreg::enums::*;
use winreg::RegKey;

const SERVICE_NAME: &str = "SecurityService";

// ---------------------------------------------------------
// MACRO GHI LOG VÀO FILE: C:\Windows\Temp\security_service.log
// Để chúng ta biết chính xác Service bị lỗi ở đâu thay vì mù log
// ---------------------------------------------------------
macro_rules! sys_log {
    ($($arg:tt)*) => {{
        use std::io::Write;
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("C:\\Windows\\Temp\\security_service.log")
        {
            // Lấy thời gian format đơn giản
            let ts = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
            let _ = writeln!(file, "[{}] {}", ts, format_args!($($arg)*));
        }
    }};
}

define_windows_service!(ffi_service_main, my_service_main);

fn main() -> Result<(), windows_service::Error> {
    sys_log!("=========================================");
    
    let args: Vec<String> = std::env::args().collect();
    if args.contains(&"--dev".to_string()) {
        sys_log!("[Main] Đang chạy trong tiến trình Console (--dev) bypass SCM.");
        start_socketio_client();
        std::thread::spawn(|| {
            sys_log!("[NamedPipe] Đang khởi chạy Server...");
            security::ipc::named_pipe::start_server();
        });
        println!("🚀 Đang chạy chế độ Developer Mode. Nhấn Ctrl+C để thoát.");
        loop { std::thread::sleep(std::time::Duration::from_secs(60)); }
    }

    sys_log!("[Main] Bắt đầu gọi service_dispatcher...");
    
    // Đăng ký với Windows Service Control Manager (SCM)
    if let Err(e) = service_dispatcher::start(SERVICE_NAME, ffi_service_main) {
        sys_log!("[Main] LỖI NGHIÊM TRỌNG: dispatcher start thất bại: {}", e);
        return Err(e);
    }
    
    sys_log!("[Main] Dịch vụ đã kết thúc an toàn.");
    Ok(())
}

fn my_service_main(_arguments: Vec<OsString>) {
    sys_log!("[my_service_main] Tiến trình bắt đầu khởi tạo.");
    let (stop_tx, stop_rx) = mpsc::channel();

    let event_handler = move |control_event| -> ServiceControlHandlerResult {
        match control_event {
            ServiceControl::Stop => {
                sys_log!("Nhận lệnh STOP từ Windows.");
                let _ = stop_tx.send(());
                ServiceControlHandlerResult::NoError
            }
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    };

    let status_handle = match service_control_handler::register(SERVICE_NAME, event_handler) {
        Ok(handle) => handle,
        Err(e) => {
            sys_log!("[my_service_main] LỖI: Không thể register service: {}", e);
            return;
        }
    };

    // BÁO CÁO RUNNING CHO WINDOWS NGAY LẬP TỨC ĐỂ TRÁNH LỖI 1053
    let _ = status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    });

    sys_log!("[my_service_main] Đăng ký thành công. Trạng thái: RUNNING.");

    // Chạy Socket.IO Client ở background thread
    start_socketio_client();

    // Chạy Named Pipe Server ở background thread
    std::thread::spawn(|| {
        sys_log!("[NamedPipe] Đang khởi chạy Server...");
        named_pipe::start_server();
    });

    // Luồng chính đợi tín hiệu Dừng (Stop) từ SCM
    let _ = stop_rx.recv();

    sys_log!("[my_service_main] Đang dừng Service...");
    
    let _ = status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Stopped,
        controls_accepted: ServiceControlAccept::empty(),
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    });
}

fn get_machine_id() -> String {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(subkey) = hklm.open_subkey("SOFTWARE\\Microsoft\\Cryptography") {
        if let Ok(guid) = subkey.get_value::<String, _>("MachineGuid") {
            return guid;
        }
    }
    std::env::var("COMPUTERNAME").unwrap_or_else(|_| "unknown_pc".to_string())
}

fn get_location_info() -> serde_json::Value {
    if let Ok(resp) = reqwest::blocking::get("http://ip-api.com/json/") {
        if let Ok(json) = resp.json::<serde_json::Value>() {
            return json;
        }
    }
    json!({"status": "fail", "message": "No external internet connection"})
}

fn start_socketio_client() {
    std::thread::spawn(|| {
        sys_log!("[SocketIO] Background thread bắt đầu.");
        
        // CÁCH AN TOÀN TRONG WINDOWS SERVICE: Đọc bằng đường dẫn tuyệt đối!
        let env_path = "C:\\Users\\Admin\\MyProject\\Security\\1_windows_service\\.env";
        let _ = dotenvy::from_path(env_path);
        
        // KHÔNG DÙNG expect() VÌ NÓ SẼ GÂY CRASH SERVICE. Dùng fallback nếu quên cấu hình.
        let secret_key = std::env::var("SECRET_KEY").unwrap_or_else(|_| {
            sys_log!("[SocketIO] CẢNH BÁO: Không tìm thấy SECRET_KEY trong .env. Dùng khóa mặc định.");
            "change_me_to_secure_key".to_string()
        });

        let relay_url = std::env::var("RELAY_URL").unwrap_or_else(|_| {
            "http://127.0.0.1:3000".to_string()
        });
        
        let device_id = Arc::new(get_machine_id());
        let device_id_for_on = Arc::clone(&device_id);
        let device_id_for_reg = Arc::clone(&device_id);
        
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis().to_string();
        
        let mut mac = match Hmac::<Sha256>::new_from_slice(secret_key.as_bytes()) {
            Ok(m) => m,
            Err(e) => {
                sys_log!("[SocketIO] Lỗi khởi tạo HMAC: {}", e);
                return;
            }
        };
        mac.update(timestamp.as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        let url = format!("{}/?timestamp={}&signature={}", relay_url, timestamp, signature);
        sys_log!("[SocketIO] Đang kết nối tới URL: {}", url);
        
        if let Ok(client) = ClientBuilder::new(url)
            .namespace("/")
            .on("error", |err, _| sys_log!("[SocketIO] Socket Error: {:#?}", err))
            .on("execute_command", move |payload: Payload, client| {
                if let Payload::Text(data) = payload {
                    if let Some(val) = data.first() {
                        let cmd = val["command"].as_str().unwrap_or("");
                        sys_log!("[SocketIO] Nhận lệnh từ Mobile: {}", cmd);
                        
                        // ===== XỬ LÝ LỆNH TỪ ĐIỆN THOẠI GỬI VỀ =====
                        if cmd == "capture_camera" {
                            sys_log!("[Command] Thực thi lệnh Camera...");
                            match camera::capture_stealth_image() {
                                Ok((path, b64_img)) => {
                                    let payload = json!({
                                        "deviceId": *device_id_for_on,
                                        "status": format!("Đã chụp lén Camera thành công! File lưu tại: {}", path),
                                        "image": b64_img
                                    });
                                    let _ = client.emit("status_update", payload);
                                }
                                Err(e) => {
                                    let _ = client.emit("status_update", json!({"deviceId": *device_id_for_on, "status": format!("Lỗi Camera: {}", e)}));
                                }
                            }
                            
                        } else if cmd == "lock_pc" {
                            unsafe {
                                let session_id = windows::Win32::System::RemoteDesktop::WTSGetActiveConsoleSessionId();
                                if session_id != 0xFFFFFFFF {
                                    let _ = std::process::Command::new("tsdiscon.exe").arg(session_id.to_string()).spawn();
                                } else {
                                    let _ = std::process::Command::new("rundll32.exe").args(&["user32.dll,LockWorkStation"]).spawn();
                                }
                            }
                            let _ = client.emit("status_update", json!({"deviceId": *device_id_for_on, "status": "Đã khóa máy tính."}));
                            
                        } else if cmd == "change_password" {
                            let new_pass = val["payload"]["password"].as_str().unwrap_or("Security@123");
                            let username = val["payload"]["username"].as_str().unwrap_or("Admin");
                            match password::change_windows_password(username, new_pass, "") {
                                Ok(_) => { let _ = client.emit("status_update", json!({"deviceId": *device_id_for_on, "status": format!("Đã đổi mật khẩu account {} thành công!", username)})); }
                                Err(e) => { let _ = client.emit("status_update", json!({"deviceId": *device_id_for_on, "status": format!("Lỗi đổi mật khẩu: {}", e)})); }
                            }
                        } else if cmd == "lock_usb" {
                            match usb_control::lock_usb() {
                                Ok(_) => { let _ = client.emit("status_update", json!({"deviceId": *device_id_for_on, "status": "Đã khóa cổng USB thành công!"})); }
                                Err(e) => { let _ = client.emit("status_update", json!({"deviceId": *device_id_for_on, "status": format!("Lỗi khóa USB: {}", e)})); }
                            }
                        } else if cmd == "unlock_usb" {
                            match usb_control::unlock_usb() {
                                Ok(_) => { let _ = client.emit("status_update", json!({"deviceId": *device_id_for_on, "status": "Đã mở khóa cổng USB thành công!"})); }
                                Err(e) => { let _ = client.emit("status_update", json!({"deviceId": *device_id_for_on, "status": format!("Lỗi mở khóa USB: {}", e)})); }
                            }
                        } else if cmd == "request_location" {
                            let loc = get_location_info();
                            let _ = client.emit("status_update", json!({"deviceId": *device_id_for_on, "status": "Cập nhật vị trí mới thành công", "location": loc}));
                        }
                    }
                }
            })
            .connect() 
        {
            sys_log!("[SocketIO] Kết nối thành công. Đang gửi data Register...");
            let location = get_location_info();
            let reg_data = json!({
                "type": "pc_service",
                "deviceId": *device_id_for_reg,
                "location": location
            });
            let _ = client.emit("register", reg_data);
            
            loop { std::thread::sleep(Duration::from_secs(60)); }
        } else {
            sys_log!("[SocketIO] LỖI: Không thể kết nối Socket.IO tới server!");
        }
    });
}