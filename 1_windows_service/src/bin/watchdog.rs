// ============================================================
// watchdog.rs - Service bảo vệ (Watchdog / "Chó gác cổng")
// Giám sát main_service, tự khởi động lại nếu bị tắt
// ============================================================

use std::time::Duration;
use sysinfo::{System, ProcessRefreshKind, RefreshKind};

fn main() {
    env_logger::init();
    log::info!("[Watchdog] Khởi động Watchdog Service...");

    let mut sys = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::everything())
    );

    loop {
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let mut is_running = false;
        
        for (_, process) in sys.processes() {
            if let Some(name) = process.name().to_str() {
                // Tên process của main_service khi build (main_service.exe)
                if name.to_lowercase() == "main_service.exe" {
                    is_running = true;
                    break;
                }
            }
        }

        if !is_running {
            log::warn!("[Watchdog] Phát hiện main_service bị tắt! Đang khởi động lại...");
            // TODO: Khởi động lại service bằng Command::new("net").arg("start")...
            let _ = std::process::Command::new("sc")
                .args(["start", "MySecureService"]) // Tên service thực tế đăng ký trong SCM
                .output();
                
            // Có thể call/gửi HTTP request cảnh báo qua Node.js server ở đây
            log::info!("[Watchdog] Đã ra lệnh khởi động lại Service.");
        } else {
            log::debug!("[Watchdog] main_service vẫn đang hoạt động.");
        }

        std::thread::sleep(Duration::from_secs(10));
    }
}
