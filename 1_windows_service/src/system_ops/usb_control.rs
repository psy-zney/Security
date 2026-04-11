// ============================================================
// usb_control.rs - Khóa/mở USB qua Windows Registry
// Key: HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR
// Start = 4 (Disabled) / 3 (Manual = Enabled)
// ============================================================

/// Khóa tất cả cổng USB (đặt USBSTOR Start = 4)
pub fn lock_usb() -> Result<(), String> {
    // TODO: Mở registry key HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR
    // TODO: Set "Start" = REG_DWORD 4
    log::info!("[USB] Đang khóa USB...");
    Err("Not implemented yet".into())
}

/// Mở khóa cổng USB (đặt USBSTOR Start = 3)
pub fn unlock_usb() -> Result<(), String> {
    // TODO: Mở registry key HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR
    // TODO: Set "Start" = REG_DWORD 3
    log::info!("[USB] Đang mở khóa USB...");
    Err("Not implemented yet".into())
}
