// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn trigger_lock() -> Result<String, String> {
    use std::fs;
    match fs::write("C:\\lock_pc.txt", "trigger") {
        Ok(_) => Ok("Tạo file C:\\lock_pc.txt thành công. Service sẽ thực thi khóa PC.".to_string()),
        Err(e) => Err(format!("Lỗi khi tạo file, hãy chạy ứng dụng với Run as Administrator: {}", e)),
    }
}

#[tauri::command]
fn trigger_change_password(new_pass: &str) -> Result<String, String> {
    use std::fs;
    match fs::write("C:\\change_pwd.txt", new_pass) {
        Ok(_) => Ok("Tạo file C:\\change_pwd.txt thành công. Đổi mật khẩu giả lập.".to_string()),
        Err(e) => Err(format!("Lỗi: {}", e)),
    }
}

#[tauri::command]
fn trigger_lock_usb() -> Result<String, String> {
    use std::fs;
    match fs::write("C:\\lock_usb.txt", "trigger") {
        Ok(_) => Ok("Tạo file C:\\lock_usb.txt thành công. Khóa USB giả lập.".to_string()),
        Err(e) => Err(format!("Lỗi: {}", e)),
    }
}

#[tauri::command]
fn trigger_capture_camera() -> Result<String, String> {
    use std::fs;
    let img_path = "C:\\Users\\Public\\temp_capture.svg";
    let svg_content = "<svg width=\"400\" height=\"300\" xmlns=\"http://www.w3.org/2000/svg\">\n  <rect width=\"100%\" height=\"100%\" fill=\"#2c3e50\"/>\n  <text x=\"50%\" y=\"50%\" font-size=\"24\" text-anchor=\"middle\" fill=\"#ecf0f1\" dominant-baseline=\"middle\">Camera Mock Picture</text>\n</svg>";
    match fs::write(img_path, svg_content) {
        Ok(_) => Ok(img_path.to_string()),
        Err(e) => Err(format!("Lỗi khi lưu ảnh: {}", e)),
    }
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            trigger_lock, 
            trigger_change_password, 
            trigger_lock_usb, 
            trigger_capture_camera,
            read_mock_image,
            get_machine_id
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
