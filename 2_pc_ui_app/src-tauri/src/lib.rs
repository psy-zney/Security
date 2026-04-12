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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, trigger_lock])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
