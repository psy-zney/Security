// ============================================================
// watchdog.rs - Service bảo vệ (Watchdog / "Chó gác cổng")
// Giám sát main_service, tự khởi động lại nếu bị tắt
// ============================================================

fn main() {
    env_logger::init();
    log::info!("[Watchdog] Khởi động Watchdog Service...");

    loop {
        // TODO: Kiểm tra xem main_service có đang chạy không
        // TODO: Nếu không chạy → khởi động lại main_service
        // TODO: Sleep N giây rồi lặp lại
        std::thread::sleep(std::time::Duration::from_secs(10));
    }
}
