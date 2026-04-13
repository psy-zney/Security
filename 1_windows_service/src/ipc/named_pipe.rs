

use crate::ipc::commands::{SecureCommand, CommandResponse};
use crate::system_ops::{password, usb_control, camera, network};

pub fn start_server() {
    log::info!("[NamedPipe/FilePolling] Khởi động Server chờ lệnh từ UI...");
    
    loop {
        // ... Polling removed, this loop can be repurposed for real pipes eventually 
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
                Ok((path, _)) => CommandResponse::Data { payload: path },
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
