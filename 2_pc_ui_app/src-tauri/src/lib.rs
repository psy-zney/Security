// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use std::fs::OpenOptions;
use std::io::{Read, Write};
use tauri::{command, Emitter, Window};

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

#[command]
async fn start_oauth_server(window: Window) -> Result<u16, String> {
    tauri_plugin_oauth::start_with_config(
        tauri_plugin_oauth::OauthConfig {
            ports: Some(vec![8989]),
            ..Default::default()
        },
        move |url| {
            let _ = window.emit("oauth_callback", url);
        },
    )
    .map_err(|err| err.to_string())
}

fn send_payload_to_pipe(payload: &str) -> Result<String, String> {
    let mut pipe = match OpenOptions::new()
        .read(true)
        .write(true)
        .open(r"\\.\pipe\SecurityCorePipe") 
    {
        Ok(p) => p,
        Err(e) => return Err(format!("Không thể kết nối tới Windows Service (Service có đang chạy không?): {}", e)),
    };

    if let Err(e) = pipe.write_all(payload.as_bytes()) {
        return Err(format!("Lỗi gửi lệnh tới Service: {}", e));
    }

    let mut response = String::new();
    if let Err(e) = pipe.read_to_string(&mut response) {
        return Err(format!("Lỗi nhận phản hồi từ Service: {}", e));
    }

    Ok(response)
}

#[tauri::command]
fn trigger_lock() -> Result<String, String> {
    // Note: SecureCommand has no LockPc, wait, does it? 
    // In original commands.rs there is no LockPc! The Mobile app sent "lock_pc" and the service main_service.rs handled it directly!
    // Let me send LockPc or similar if it existed.
    // Wait, let's look at `commands.rs` again... Ah, "LockUsb", "UnlockUsb", "CaptureImage", "GetLocation", "GetIp", "ChangePassword".
    // I should send the exact JSON string that matches `SecureCommand` enum.
    // If we want PC Lock, we might need to add it to `SecureCommand`. For now, let's just send raw json and update commands.rs next.
    send_payload_to_pipe(r#""LockPc""#)
}

#[tauri::command]
fn trigger_change_password(new_pass: &str) -> Result<String, String> {
    let payload = format!(r#"{{"ChangePassword": {{"username": "Admin", "new_password": "{}", "pin": ""}}}}"#, new_pass);
    send_payload_to_pipe(&payload)
}

#[tauri::command]
fn trigger_lock_usb() -> Result<String, String> {
    send_payload_to_pipe(r#""LockUsb""#)
}

#[tauri::command]
fn trigger_capture_camera() -> Result<String, String> {
    // Trả về đường dẫn ảnh ngầm
    send_payload_to_pipe(r#""CaptureImage""#)
}

#[tauri::command]
fn trigger_set_kill_otp(otp: &str) -> Result<String, String> {
    let payload = format!(r#"{{"SetKillOtp": {{"otp": "{}"}}}}"#, otp);
    send_payload_to_pipe(&payload)
}

#[tauri::command]
fn trigger_resume_service() -> Result<String, String> {
    send_payload_to_pipe(r#""ResumeService""#)
}

#[tauri::command]
fn download_and_update_service(relay_url: &str) -> Result<String, String> {
    use std::fs;
    use std::path::Path;
    use std::process::Command;
    use std::io::Write;

    let temp_dir = "C:\\Windows\\Temp\\security_update";
    if !Path::new(temp_dir).exists() {
        fs::create_dir_all(temp_dir).map_err(|e| format!("Không thể tạo thư mục tạm: {}", e))?;
    }

    let main_url = format!("{}/updates/main_service.exe", relay_url);
    let watchdog_url = format!("{}/updates/watchdog.exe", relay_url);

    let mut main_resp = reqwest::blocking::get(&main_url).map_err(|e| format!("Lỗi tải main_service: {}", e))?;
    let mut main_file = fs::File::create(format!("{}\\main_service.exe", temp_dir)).map_err(|e| e.to_string())?;
    main_resp.copy_to(&mut main_file).map_err(|e| e.to_string())?;

    let mut dog_resp = reqwest::blocking::get(&watchdog_url).map_err(|e| format!("Lỗi tải watchdog: {}", e))?;
    let mut dog_file = fs::File::create(format!("{}\\watchdog.exe", temp_dir)).map_err(|e| e.to_string())?;
    dog_resp.copy_to(&mut dog_file).map_err(|e| e.to_string())?;

    let bat_path = format!("{}\\update.bat", temp_dir);
    let bat_content = r#"
@echo off
echo Đang tắt Service cũ...
sc stop SecurityWatchdog
sc stop SecurityService
timeout /t 3 /nobreak >nul

echo Đang cài đặt bản mới...
copy /Y "C:\Windows\Temp\security_update\main_service.exe" "C:\ProgramData\SecuritySystem\bin\main_service.exe"
copy /Y "C:\Windows\Temp\security_update\watchdog.exe" "C:\ProgramData\SecuritySystem\bin\watchdog.exe"

echo Đang khởi động lại Service...
sc start SecurityService
sc start SecurityWatchdog

echo Cập nhật thành công!
timeout /t 2 /nobreak >nul
"#;
    
    fs::write(&bat_path, bat_content).map_err(|e| e.to_string())?;

    let script = format!("Start-Process cmd -ArgumentList '/c \"{}\"' -Verb RunAs", bat_path);
    Command::new("powershell")
        .args(&["-Command", &script])
        .spawn()
        .map_err(|e| format!("Không thể chạy updater: {}", e))?;

    Ok("Đã khởi chạy tiến trình cập nhật. Vui lòng nhấn 'Yes' nếu được hỏi quyền Admin.".to_string())
}

#[tauri::command]
fn read_mock_image(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_machine_id() -> String {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(subkey) = hklm.open_subkey("SOFTWARE\\Microsoft\\Cryptography") {
        if let Ok(guid) = subkey.get_value::<String, _>("MachineGuid") {
            return guid;
        }
    }
    "unknown_device".to_string()
}

#[derive(serde::Serialize, serde::Deserialize)]
struct AppConfig {
    #[serde(rename = "RELAY_URL")]
    relay_url: String,
    #[serde(rename = "SECRET_KEY")]
    secret_key: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            relay_url: "http://127.0.0.1:3000".to_string(),
            secret_key: "DEFAULT_SECRET_KEY".to_string(),
        }
    }
}

#[tauri::command]
fn get_app_config() -> Result<String, String> {
    use std::fs;
    let config_dir = "C:\\ProgramData\\SecuritySystem";
    let config_path_old = format!("{}\\config.json", config_dir);
    let config_path_enc = format!("{}\\config.enc", config_dir);

    // Creates directory if missing
    let _ = fs::create_dir_all(config_dir);

    // MIGRATION: Cố gắng đọc config.json (plain-text). Nếu có, mã hoá lưu sang config.enc và xoá file cũ.
    if let Ok(data) = fs::read_to_string(&config_path_old) {
        if let Ok(cfg) = serde_json::from_str::<AppConfig>(&data) {
            let json_str = serde_json::to_string_pretty(&cfg).unwrap_or_default();
            if let Ok(enc_str) = encrypt_dpapi(json_str.as_bytes()) {
                let _ = fs::write(&config_path_enc, enc_str);
                let _ = fs::remove_file(&config_path_old); // Xoá file plain text ngay lập tức
                return Ok(json_str);
            }
        }
    }

    // Bình thường: Đọc file mã hoá (config.enc)
    if let Ok(enc_data) = fs::read_to_string(&config_path_enc) {
        if let Ok(raw_bytes) = decrypt_dpapi(&enc_data) {
            if let Ok(json_str) = String::from_utf8(raw_bytes) {
                return Ok(json_str);
            }
        }
    }

    // Nếu không file nào tồn tại hoặc giải mã phát hiện lỗi thì rơi vào chế độ mặc định cực an toàn.
    let default_cfg = AppConfig::default();
    let default_json = serde_json::to_string_pretty(&default_cfg).unwrap_or_default();
    if let Ok(enc_str) = encrypt_dpapi(default_json.as_bytes()) {
        let _ = fs::write(&config_path_enc, enc_str);
    }
    
    Ok(default_json)
}

#[tauri::command]
fn save_app_config(relay_url: String, secret_key: String) -> Result<String, String> {
    use std::fs;
    let config_dir = "C:\\ProgramData\\SecuritySystem";
    let config_path_enc = format!("{}\\config.enc", config_dir);
    let _ = fs::create_dir_all(config_dir);
    
    let cfg = AppConfig {
        relay_url,
        secret_key,
    };
    let json_str = serde_json::to_string(&cfg).unwrap_or_default();
    match encrypt_dpapi(json_str.as_bytes()) {
        Ok(enc_str) => {
            if fs::write(&config_path_enc, enc_str).is_ok() {
                Ok("Saved".to_string())
            } else {
                Err("Lỗi ghi file config".to_string())
            }
        }
        Err(e) => Err(e),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            trigger_lock, 
            trigger_change_password, 
            trigger_lock_usb, 
            trigger_capture_camera,
            trigger_set_kill_otp,
            trigger_resume_service,
            download_and_update_service,
            read_mock_image,
            get_machine_id,
            get_app_config,
            save_app_config,
            start_oauth_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
