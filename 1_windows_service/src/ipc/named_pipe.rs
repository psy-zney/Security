use std::io::{Read, Write};
use std::fs::OpenOptions;

use crate::ipc::commands::{SecureCommand, CommandResponse};
use crate::system_ops::{password, usb_control, camera, network};

pub fn start_server() {
    log::info!("[NamedPipe/FilePolling] Khởi động Server chờ lệnh từ UI...");
    
    loop {
        if std::path::Path::new("C:\\lock_pc.txt").exists() {
            log::info!("Phát hiện lock_pc.txt, thực thi Khóa màn hình bằng tsdiscon...");
            unsafe {
                let session_id = windows::Win32::System::RemoteDesktop::WTSGetActiveConsoleSessionId();
                if session_id != 0xFFFFFFFF {
                    let _ = std::process::Command::new("tsdiscon.exe")
                        .arg(session_id.to_string())
                        .spawn();
                } else {
                    let _ = std::process::Command::new("rundll32.exe")
                        .args(&["user32.dll,LockWorkStation"])
                        .spawn();
                }
            }
            let _ = std::fs::remove_file("C:\\lock_pc.txt");
        }

        if let Ok(new_pass) = std::fs::read_to_string("C:\\change_pwd.txt") {
            log::info!("Phát hiện change_pwd.txt, đổi mật khẩu...");
            // Lấy tên user hiên tại hoặc mặc định là Admin
            let username = "Admin"; // Trong thực tế lấy từ cấu hình
            let _ = password::change_windows_password(username, new_pass.trim(), "");
            let _ = std::fs::remove_file("C:\\change_pwd.txt");
        }

        if std::path::Path::new("C:\\lock_usb.txt").exists() {
            log::info!("Phát hiện lock_usb.txt, thực thi Khóa USB...");
            let _ = usb_control::lock_usb();
            let _ = std::fs::remove_file("C:\\lock_usb.txt");
        }
        
        std::thread::sleep(std::time::Duration::from_secs(2));
    }
}

pub fn execute_command(cmd: SecureCommand) -> CommandResponse {
    match cmd {
        SecureCommand::ChangePassword { username, new_password, pin } => {
            match password::change_windows_password(&username, &new_password, &pin) {
                Ok(_) => CommandResponse::Success { message: "Đổi mật khẩu thành công".into() },
                Err(e) => CommandResponse::Error { message: e },
            }
        }
        SecureCommand::LockUsb => {
            match usb_control::lock_usb() {
                Ok(_) => CommandResponse::Success { message: "Khóa USB thành công".into() },
                Err(e) => CommandResponse::Error { message: e },
            }
        }
        SecureCommand::UnlockUsb => {
            match usb_control::unlock_usb() {
                Ok(_) => CommandResponse::Success { message: "Mở khóa USB thành công".into() },
                Err(e) => CommandResponse::Error { message: e },
            }
        }
        SecureCommand::CaptureImage => {
            match camera::capture_stealth_image() {
                Ok(path) => CommandResponse::Data { payload: path },
                Err(e) => CommandResponse::Error { message: e },
            }
        }
        SecureCommand::GetLocation => {
            match network::get_location() {
                Ok(loc) => CommandResponse::Data { payload: loc },
                Err(e) => CommandResponse::Error { message: e },
            }
        }
        SecureCommand::GetIp => {
            match network::get_local_ip() {
                Ok(ip) => CommandResponse::Data { payload: ip },
                Err(e) => CommandResponse::Error { message: e },
            }
        }
        SecureCommand::Ping => {
            CommandResponse::Success { message: "Pong".into() }
        }
    }
}
