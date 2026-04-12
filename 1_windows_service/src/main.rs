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

use windows::core::{PCWSTR, PWSTR};
use windows::Win32::NetworkManagement::NetManagement::{NetUserSetInfo, USER_INFO_1003};
// Lưu ý: Đổi lại đường dẫn nếu bản windows-rs của bạn yêu cầu UI::WindowsAndMessaging
use windows::Win32::System::Shutdown::LockWorkStation;
use std::env;
use std::fs;
use std::process::Command;
use std::path::Path;

const SERVICE_NAME: &str = "MySecureService"; // Tên đồng nhất
const SERVICE_TYPE: ServiceType = ServiceType::OWN_PROCESS;

fn deploy_to_system() {
    let current_exe = env::current_exe().expect("Failed to get current exe path");
    let target_path = Path::new("C:\\Windows\\security_core.exe");

    if current_exe != target_path {
        if let Ok(_) = fs::copy(&current_exe, target_path) {
            // Sửa đúng tên SERVICE_NAME ở đây
            let _ = Command::new("cmd")
                .args(&[
                    "/C", 
                    "sc", "config", SERVICE_NAME, 
                    "binPath=", "C:\\Windows\\security_core.exe"
                ])
                .output();

            let exe_path = format!("\"{}\"", current_exe.to_str().unwrap());
            let _ = Command::new("cmd")
                .args(&[
                    "/C",
                    "timeout", "/t", "5", "&&", "del", &exe_path
                ])
                .spawn();
        }
    }
}

define_windows_service!(ffi_service_main, my_service_main);

fn main() -> Result<(), windows_service::Error> {
    service_dispatcher::start(SERVICE_NAME, ffi_service_main)
}

fn my_service_main(_arguments: Vec<OsString>) {
    let event_handler = move |control_event| -> ServiceControlHandlerResult {
        match control_event {
            ServiceControl::Stop => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    };

    let status_handle = service_control_handler::register(SERVICE_NAME, event_handler).unwrap();

    status_handle.set_service_status(ServiceStatus {
        service_type: SERVICE_TYPE,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    }).unwrap();

    deploy_to_system();

    loop {
        // Kiểm tra file trigger để đổi mật khẩu
        if Path::new("C:\\lock_pc.txt").exists() {
            change_windows_password("Admin", "Security@123"); // Đổi "Admin" thành user máy bạn
            let _ = fs::remove_file("C:\\lock_pc.txt");
        }
        std::thread::sleep(Duration::from_secs(5));
    }
}

fn change_windows_password(username: &str, new_password: &str) {
    unsafe {
        let user_wide: Vec<u16> = username.encode_utf16().chain(Some(0)).collect();
        let mut pass_wide: Vec<u16> = new_password.encode_utf16().chain(Some(0)).collect();

        let mut user_info = USER_INFO_1003 {
            usri1003_password: PWSTR(pass_wide.as_mut_ptr()),
        };

        let result = NetUserSetInfo(
            PCWSTR(std::ptr::null()),
            PCWSTR(user_wide.as_ptr()),
            1003,
            &mut user_info as *mut _ as *mut u8,
            None,
        );

        if result == 0 {
            let _ = LockWorkStation();
        }
    }
}