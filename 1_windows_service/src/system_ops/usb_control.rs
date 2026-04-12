// ============================================================
// usb_control.rs - Khóa/mở USB qua Windows Registry
// Key: HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR
// Start = 4 (Disabled) / 3 (Manual = Enabled)
// ============================================================

use winreg::enums::*;
use winreg::RegKey;

/// Khóa tất cả cổng USB (đặt USBSTOR Start = 4)
pub fn lock_usb() -> Result<(), String> {
    log::info!("[USB] Đang khóa USB...");
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let subkey = "SYSTEM\\CurrentControlSet\\Services\\USBSTOR";
    
    // Yêu cầu quyền KEY_SET_VALUE
    let usb_key = hklm.open_subkey_with_flags(subkey, KEY_SET_VALUE)
        .map_err(|e| format!("Không thể mở USBSTOR registry key: {}", e))?;
        
    usb_key.set_value("Start", &4u32)
        .map_err(|e| format!("Không thể thay đổi giá trị Registry: {}", e))?;
        
    Ok(())
}

/// Mở khóa cổng USB (đặt USBSTOR Start = 3)
pub fn unlock_usb() -> Result<(), String> {
    log::info!("[USB] Đang mở khóa USB...");
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let subkey = "SYSTEM\\CurrentControlSet\\Services\\USBSTOR";
    
    // Yêu cầu quyền KEY_SET_VALUE
    let usb_key = hklm.open_subkey_with_flags(subkey, KEY_SET_VALUE)
        .map_err(|e| format!("Không thể mở USBSTOR registry key: {}", e))?;
        
    usb_key.set_value("Start", &3u32)
        .map_err(|e| format!("Không thể thay đổi giá trị Registry: {}", e))?;
        
    Ok(())
}
