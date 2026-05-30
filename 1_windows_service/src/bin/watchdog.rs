// ============================================================
// watchdog.rs - Service bảo vệ (Watchdog / "Chó gác cổng")
// Giám sát main_service, tự khởi động lại nếu bị tắt
// ============================================================

use std::time::Duration;
use sysinfo::{System, ProcessRefreshKind, RefreshKind};

macro_rules! sys_log {
    ($($arg:tt)*) => {{
        use std::io::Write;
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("C:\\Windows\\Temp\\security_service.log")
        {
            let ts = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_else(|_| std::time::Duration::from_secs(0)).as_secs();
            let _ = writeln!(file, "[{}] {}", ts, format_args!($($arg)*));
        }
    }};
}

fn main() {
    sys_log!("[Watchdog] Khởi động Watchdog Service...");

    let mut sys = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::everything())
    );

    loop {
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let mut is_running = false;
        
        for (_, process) in sys.processes() {
            if let Some(name) = process.name().to_str() {
                if name.to_lowercase() == "main_service.exe" {
                    is_running = true;
                    break;
                }
            }
        }

        if !is_running {
            sys_log!("[Watchdog] Phát hiện main_service bị tắt! Đang khởi động lại...");
            if let Err(e) = std::process::Command::new("sc")
                .args(["start", "SecurityService"]) 
                .output() {
                sys_log!("[Watchdog] Lỗi khi gọi `sc start SecurityService`: {}", e);
            } else {
                sys_log!("[Watchdog] Đã ra lệnh khởi động lại Service thành công.");
            }
        } else {
            // sys_log!("[Watchdog] main_service vẫn đang hoạt động."); // Commented out to avoid log spam every 10 seconds
        }

        std::thread::sleep(Duration::from_secs(10));
    }
}
