// ============================================================
// main_service.rs - Service chính chạy ngầm trên Windows
// Lắng nghe lệnh từ App UI qua Named Pipe
// ============================================================

use security::ipc::named_pipe;
use security::system_ops;

fn main() {
    env_logger::init();
    log::info!("[MainService] Khởi động Security Windows Service...");

    // TODO: Đăng ký với Windows Service Control Manager (SCM)
    // TODO: Phát sinh Named Pipe Server để nhận lệnh từ UI
    named_pipe::start_server();
}
