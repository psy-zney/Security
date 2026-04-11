// ============================================================
// password.rs - Đổi mật khẩu Windows qua WinAPI (NetUserSetInfo)
// ============================================================

/// Đổi mật khẩu cho một user Windows
/// # Arguments
/// * `username` - Tên tài khoản Windows
/// * `new_password` - Mật khẩu mới cần đặt
pub fn change_windows_password(username: &str, new_password: &str) -> Result<(), String> {
    // TODO: Gọi NetUserSetInfo với USER_INFO_1003
    // TODO: Xử lý lỗi NERR_PasswordTooShort, ERROR_ACCESS_DENIED, ...
    log::info!("[Password] Đang đổi mật khẩu cho user: {}", username);
    Err("Not implemented yet".into())
}
