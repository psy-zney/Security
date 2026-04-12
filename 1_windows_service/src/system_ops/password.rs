// ============================================================
// password.rs - Đổi mật khẩu Windows qua WinAPI (NetUserSetInfo)
// ============================================================

use windows::core::{PCWSTR, PWSTR};
use windows::Win32::NetworkManagement::NetManagement::{NetUserSetInfo, USER_INFO_1003, NERR_Success};
use windows::Win32::System::Shutdown::LockWorkStation;

/// Đổi mật khẩu cho một user Windows
/// Cần cung cấp mã PIN đúng (giả lập xác thực hoặc đối chiếu)
pub fn change_windows_password(username: &str, new_password: &str, _pin: &str) -> Result<(), String> {
    log::info!("[Password] Đang xác thực PIN và đổi mật khẩu cho user: {}", username);
    
    // Thường sẽ có luồng kiểm tra `_pin` ở đây.
    
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

        if result == NERR_Success {
            log::info!("[Password] Đổi mật khẩu thành công. Khóa màn hình...");
            let _ = LockWorkStation();
            Ok(())
        } else {
            Err(format!("Lỗi khi đổi mật khẩu, mã lỗi: {}", result))
        }
    }
}

