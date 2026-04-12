// ============================================================
// main_service.rs - Service chính chạy ngầm trên Windows
// Lắng nghe lệnh từ App UI qua Named Pipe
// ============================================================

use security::ipc::named_pipe;
use security::system_ops;

use std::ffi::OsString;
use std::time::Duration;
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    service_dispatcher,
};

const SERVICE_NAME: &str = "SecurityService";

define_windows_service!(ffi_service_main, my_service_main);

fn main() -> Result<(), windows_service::Error> {
    env_logger::init();
    log::info!("[MainService] Khởi động Security Windows Service...");

    // Đăng ký với Windows Service Control Manager (SCM)
    service_dispatcher::start(SERVICE_NAME, ffi_service_main)
}

fn my_service_main(_arguments: Vec<OsString>) {
    let event_handler = move |control_event| -> ServiceControlHandlerResult {
        match control_event {
            ServiceControl::Stop => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    };

    let status_handle = match service_control_handler::register(SERVICE_NAME, event_handler) {
        Ok(handle) => handle,
        Err(e) => {
            log::error!("Không thể register service: {}", e);
            return;
        }
    };

    let _ = status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    });

    log::info!("[MainService] Đăng ký thành công SCM. Chạy server Named Pipe...");

    // Phát sinh Named Pipe Server để nhận lệnh từ UI
    named_pipe::start_server();
}
