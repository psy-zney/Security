

use crate::ipc::commands::{SecureCommand, CommandResponse};
use crate::system_ops::{password, usb_control, camera, network};


use std::ptr::null_mut;
use windows::Win32::Foundation::{CloseHandle, ERROR_PIPE_CONNECTED, GetLastError, HANDLE, INVALID_HANDLE_VALUE};
use windows::Win32::Security::Authorization::ConvertStringSecurityDescriptorToSecurityDescriptorW;
use windows::Win32::Security::{SECURITY_ATTRIBUTES, PSECURITY_DESCRIPTOR};
use windows::Win32::Storage::FileSystem::{ReadFile, WriteFile, FlushFileBuffers, PIPE_ACCESS_DUPLEX};
use windows::Win32::System::Pipes::{ConnectNamedPipe, CreateNamedPipeW, DisconnectNamedPipe, PIPE_READMODE_MESSAGE, PIPE_TYPE_MESSAGE, PIPE_WAIT};
use windows::core::{HSTRING, PCWSTR};

pub fn start_server(emit_tx: std::sync::mpsc::Sender<String>) {
    log::info!("[NamedPipe] Bắt đầu khởi động SecurityCorePipe Server...");
    unsafe {
        let sddl = HSTRING::from("D:(A;;GWGR;;;AU)");
        let mut sd_ptr: PSECURITY_DESCRIPTOR = PSECURITY_DESCRIPTOR(null_mut());
        
        let success = ConvertStringSecurityDescriptorToSecurityDescriptorW(
            PCWSTR(sddl.as_ptr()), 
            1, 
            &mut sd_ptr, 
            None
        );
        
        if success.is_err() {
            log::error!("[NamedPipe] Không thể parse SDDL!");
            return;
        }

        let mut sa = SECURITY_ATTRIBUTES {
            nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
            lpSecurityDescriptor: sd_ptr.0,
            bInheritHandle: false.into(),
        };

        let pipe_name = HSTRING::from(r"\\.\pipe\SecurityCorePipe");

        loop {
            let pipe_handle: HANDLE = CreateNamedPipeW(
                PCWSTR(pipe_name.as_ptr()),
                PIPE_ACCESS_DUPLEX,
                PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
                255, // Max instances
                4096, // Out buffer
                4096, // In buffer
                0, // Default time-out
                Some(&mut sa),
            );

            if pipe_handle == INVALID_HANDLE_VALUE {
                log::error!("[NamedPipe] Tạo pipe thất bại.");
                std::thread::sleep(std::time::Duration::from_secs(5));
                continue;
            }

            let connected = ConnectNamedPipe(pipe_handle, None).is_ok() || GetLastError() == ERROR_PIPE_CONNECTED;

            if connected {
                let pipe_raw = pipe_handle.0 as usize;
                let tx = emit_tx.clone();
                std::thread::spawn(move || {
                    let pipe_handle = HANDLE(pipe_raw as *mut std::ffi::c_void);
                    let mut buffer = [0u8; 4096];
                    let mut bytes_read = 0;
                    
                    if ReadFile(pipe_handle, Some(&mut buffer), Some(&mut bytes_read), None).is_ok() && bytes_read > 0 {
                        let msg = String::from_utf8_lossy(&buffer[..bytes_read as usize]).trim_matches('\0').trim().to_string();
                        log::info!("[NamedPipe] Nhận từ Tauri UI: {}", msg);
                        
                        let (response, resp_obj) = match serde_json::from_str::<SecureCommand>(&msg) {
                            Ok(cmd) => {
                                let resp = execute_command(cmd);
                                let json_resp = serde_json::to_string(&resp).unwrap_or_else(|_| "{}".to_string());
                                (json_resp, Some(resp))
                            }
                            Err(e) => {
                                let err_resp = CommandResponse::Error { message: format!("Lỗi Parse Command: {}", e) };
                                (serde_json::to_string(&err_resp).unwrap_or_default(), None)
                            }
                        };

                        if let Some(r) = resp_obj {
                            let status_text = match r {
                                CommandResponse::Success { message } => message,
                                CommandResponse::Error { message } => message,
                                CommandResponse::Data { .. } => "Đã trích xuất dữ liệu thành công".to_string(),
                            };
                            let _ = tx.send(format!("(Từ PC UI) {}", status_text));
                        }
                        
                        let mut mode = PIPE_READMODE_MESSAGE;
                        let _ = windows::Win32::System::Pipes::SetNamedPipeHandleState(pipe_handle, Some(&mut mode), None, None);
                        let mut bytes_written = 0;
                        let _ = WriteFile(pipe_handle, Some(response.as_bytes()), Some(&mut bytes_written), None);
                        let _ = FlushFileBuffers(pipe_handle);
                    }
                    
                    let _ = DisconnectNamedPipe(pipe_handle);
                    let _ = CloseHandle(pipe_handle);
                });
            } else {
                let _ = CloseHandle(pipe_handle);
            }
        }
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
        SecureCommand::LockPc => {
            unsafe {
                let session_id = windows::Win32::System::RemoteDesktop::WTSGetActiveConsoleSessionId();
                if session_id != 0xFFFFFFFF {
                    let _ = std::process::Command::new("tsdiscon.exe").arg(session_id.to_string()).spawn();
                } else {
                    let _ = std::process::Command::new("rundll32.exe").args(&["user32.dll,LockWorkStation"]).spawn();
                }
            }
            CommandResponse::Success { message: "Khóa PC thành công".into() }
        }
        SecureCommand::SetKillOtp { otp } => {
            if let Ok(mut lock) = crate::KILL_OTP.lock() {
                *lock = Some(otp);
            }
            CommandResponse::Success { message: "Đã tạo mã OTP thành công. Vui lòng nhập trên điện thoại!".into() }
        }
        SecureCommand::ResumeService => {
            crate::SERVICE_PAUSED.store(false, std::sync::atomic::Ordering::SeqCst);
            CommandResponse::Success { message: "Đã khởi động lại tiến trình bảo vệ ngầm!".into() }
        }
        SecureCommand::Ping => {
            let is_paused = crate::SERVICE_PAUSED.load(std::sync::atomic::Ordering::SeqCst);
            let status = if is_paused { "Paused" } else { "Running" };
            CommandResponse::Success { message: format!("Pong - Status: {}", status) }
        }
    }
}
