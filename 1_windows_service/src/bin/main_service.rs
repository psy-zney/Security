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
use sysinfo::{System, ProcessRefreshKind, RefreshKind};
use std::sync::{Arc, mpsc};
use winreg::enums::*;
use winreg::RegKey;

use windows::Win32::Security::Cryptography::{CryptProtectData, CryptUnprotectData, CRYPT_INTEGER_BLOB as CRYPTOAPI_BLOB, CRYPTPROTECT_LOCAL_MACHINE, CRYPTPROTECT_UI_FORBIDDEN};
use windows::Win32::Foundation::LocalFree;
use windows::core::PCWSTR;
use base64::{Engine as _, engine::general_purpose};

pub fn encrypt_dpapi(data: &[u8]) -> Result<String, String> {
    let mut data_in = CRYPTOAPI_BLOB {
        cbData: data.len() as u32,
        pbData: data.as_ptr() as *mut _,
    };
    let mut data_out = CRYPTOAPI_BLOB::default();
    
    unsafe {
        if let Err(e) = CryptProtectData(
            &mut data_in,
            PCWSTR::null(),
            None,
            None,
            None,
            CRYPTPROTECT_LOCAL_MACHINE | CRYPTPROTECT_UI_FORBIDDEN,
            &mut data_out,
        ) {
            return Err(format!("CryptProtectData failed: {}", e));
        }
        
        let slice = std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize);
        let b64 = general_purpose::STANDARD.encode(slice);
        let _ = LocalFree(Some(windows::Win32::Foundation::HLOCAL(data_out.pbData as _)));
        Ok(b64)
    }
}

pub fn decrypt_dpapi(encoded_data: &str) -> Result<Vec<u8>, String> {
    let decoded = match general_purpose::STANDARD.decode(encoded_data) {
        Ok(d) => d,
        Err(e) => return Err(format!("Base64 Error: {}", e)),
    };
    
    let mut data_in = CRYPTOAPI_BLOB {
        cbData: decoded.len() as u32,
        pbData: decoded.as_ptr() as *mut _,
    };
    let mut data_out = CRYPTOAPI_BLOB::default();
    
    unsafe {
        if let Err(e) = CryptUnprotectData(
            &mut data_in,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut data_out,
        ) {
            return Err(format!("CryptUnprotectData failed: {}", e));
        }
        
        let slice = std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize);
        let result = slice.to_vec();
        let _ = LocalFree(Some(windows::Win32::Foundation::HLOCAL(data_out.pbData as _)));
        Ok(result)
    }
}

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
        let (emit_tx, emit_rx) = mpsc::channel::<String>();
        
        start_socketio_client(emit_rx);
        std::thread::spawn(move || {
            sys_log!("[NamedPipe] Đang khởi chạy Server...");
            security::ipc::named_pipe::start_server(emit_tx);
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

    // Tạo kênh giao tiếp nội bộ giữa Named Pipe và Socket.IO
    let (emit_tx, emit_rx) = mpsc::channel::<String>();

    // Chạy Socket.IO Client ở background thread
    start_socketio_client(emit_rx);

    // Chạy Named Pipe Server ở background thread
    std::thread::spawn(move || {
        sys_log!("[NamedPipe] Đang khởi chạy Server...");
        named_pipe::start_server(emit_tx);
    });

    // Luồng Mutual Watchdog (Giám sát ngược lại Watchdog)
    std::thread::spawn(|| {
        sys_log!("[MutualWatchdog] Bắt đầu giám sát watchdog.exe...");
        let mut sys = System::new_with_specifics(
            RefreshKind::nothing().with_processes(ProcessRefreshKind::everything())
        );

        loop {
            sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
            let mut is_watchdog_running = false;
            
            for (_, process) in sys.processes() {
                if let Some(name) = process.name().to_str() {
                    if name.to_lowercase() == "watchdog.exe" {
                        is_watchdog_running = true;
                        break;
                    }
                }
            }

            if !is_watchdog_running {
                sys_log!("[MutualWatchdog] Phát hiện watchdog.exe bị tắt! Đang khởi động lại...");
                if let Err(e) = std::process::Command::new("sc").args(["start", "SecurityWatchdog"]).output() {
                    sys_log!("[MutualWatchdog] Lỗi khi gọi `sc start SecurityWatchdog`: {}", e);
                } else {
                    sys_log!("[MutualWatchdog] Đã ra lệnh khởi động lại Watchdog Service.");
                }
            }

            std::thread::sleep(Duration::from_secs(10));
        }
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

use serde::{Serialize, Deserialize};
use std::fs;

#[derive(Serialize, Deserialize, Clone)]
struct AppConfig {
    #[serde(rename = "RELAY_URL")]
    relay_url: String,
    #[serde(rename = "SECRET_KEY")]
    secret_key: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            relay_url: "https://security-relay.onrender.com".to_string(),
            secret_key: "d8a6f42b3e70d195f269a847bc83de9ef0a41d726b91a58c0df1bde7f4019e2c".to_string(),
        }
    }
}

fn load_app_config() -> (String, String) {
    let config_dir = "C:\\ProgramData\\SecuritySystem";
    let config_path_old = format!("{}\\config.json", config_dir);
    let config_path_enc = format!("{}\\config.enc", config_dir);

    // Dảm bảo thư mục tồn tại
    let _ = fs::create_dir_all(config_dir);

    // MIGRATION: Đọc config plain-text nếu có
    if let Ok(data) = fs::read_to_string(&config_path_old) {
        if let Ok(cfg) = serde_json::from_str::<AppConfig>(&data) {
            let json_str = serde_json::to_string(&cfg).unwrap_or_default();
            if let Ok(enc_str) = encrypt_dpapi(json_str.as_bytes()) {
                let _ = fs::write(&config_path_enc, enc_str);
                let _ = fs::remove_file(&config_path_old);
                sys_log!("[Config] Đã chuyển đổi thành công config.json sang config.enc bọc bởi DPAPI.");
                return (cfg.relay_url, cfg.secret_key);
            }
        }
    }

    // Bình thường: Đọc file đã mã hóa
    if let Ok(enc_data) = fs::read_to_string(&config_path_enc) {
        if let Ok(raw_bytes) = decrypt_dpapi(&enc_data) {
            if let Ok(json_str) = String::from_utf8(raw_bytes) {
                if let Ok(cfg) = serde_json::from_str::<AppConfig>(&json_str) {
                    sys_log!("[Config] Đã nạp thành công file config.enc bảo mật DPAPI.");
                    return (cfg.relay_url, cfg.secret_key);
                }
            }
        }
        sys_log!("[Config] Giải mã DPAPI thất bại! File config.enc có thể bị lỗi nội dung hoặc bị đem sang máy khác. Sử dụng fallback cấu hình.");
    } else {
        sys_log!("[Config] Không tìm thấy file config, tiến hành báo cáo khởi tạo cấu hình mặc định DPAPI.");
    }

    let default_cfg = AppConfig::default();
    let default_json = serde_json::to_string(&default_cfg).unwrap_or_default();
    if let Ok(enc_str) = encrypt_dpapi(default_json.as_bytes()) {
        let _ = fs::write(&config_path_enc, enc_str);
    }
    (default_cfg.relay_url, default_cfg.secret_key)
}

fn start_socketio_client(emit_rx: mpsc::Receiver<String>) {
    std::thread::spawn(move || {
        sys_log!("[SocketIO] Background thread bắt đầu.");
        
        let (relay_url, secret_key) = load_app_config();

        
        let device_id = Arc::new(get_machine_id());
        let device_id_for_on = Arc::clone(&device_id);
        let device_id_for_reg = Arc::clone(&device_id);
        
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_else(|_| Duration::from_secs(0)).as_millis().to_string();
        
        let mut mac = match Hmac::<Sha256>::new_from_slice(secret_key.as_bytes()) {
            Ok(m) => m,
            Err(e) => {
                sys_log!("[SocketIO] Lỗi khởi tạo HMAC: {}", e);
                return;
            }
        };
        mac.update(timestamp.as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        let url = format!("{}/?clientType=pc_service&deviceId={}&secretKey={}", relay_url, *device_id, secret_key);
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
                            let emit_client = client.clone();
                            let dev_id = device_id_for_on.clone();
                            
                            std::thread::spawn(move || {
                                match camera::capture_stealth_image() {
                                    Ok((path, b64_img)) => {
                                        let payload = json!({
                                            "deviceId": *dev_id,
                                            "status": format!("Đã chụp lén Camera thành công! File lưu tại: {}", path),
                                            "image": b64_img
                                        });
                                        let _ = emit_client.emit("status_update", payload);
                                    }
                                    Err(e) => {
                                        let _ = emit_client.emit("status_update", json!({"deviceId": *dev_id, "status": format!("Lỗi Camera: {}", e)}));
                                    }
                                }
                            });
                            
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
            
            // Loop để duy trì thread socket, đồng thời liên tục check tín hiệu từ Named Pipe nội bộ!
            loop { 
                if let Ok(status) = emit_rx.try_recv() {
                    let payload = json!({
                        "deviceId": *device_id_for_reg,
                        "status": status
                    });
                    let _ = client.emit("status_update", payload);
                    sys_log!("[SocketIO] Đã forward trạng thái từ PC_UI lên Cloud: {}", status);
                }
                std::thread::sleep(Duration::from_millis(50));
            }
        } else {
            sys_log!("[SocketIO] LỖI: Không thể kết nối Socket.IO tới server!");
        }
    });
}