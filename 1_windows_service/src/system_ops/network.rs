use std::net::UdpSocket;

/// Lấy IP nội bộ (Local IP) của máy tính dùng kỹ thuật UdpSocket dummy
pub fn get_local_ip() -> Result<String, String> {
    log::info!("[Network] Đang lấy Local IP...");
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| format!("Lỗi bind socket: {}", e))?;
    socket.connect("8.8.8.8:80").map_err(|e| format!("Lỗi connect socket: {}", e))?;
    let local_addr = socket.local_addr().map_err(|e| format!("Lỗi lấy local address: {}", e))?;
    Ok(local_addr.ip().to_string())
}

/// Lấy vị trí giả lập (Location) hoặc IP Public
/// Trong thực tế sẽ gọi lên API của ip-api.com hoặc thiết bị GPS
pub fn get_location() -> Result<String, String> {
    log::info!("[Network] Đang lấy Location...");
    // Tạm thời trả về mock data cho giai đoạn 1 (Service foundation)
    Ok("Vĩ độ: 10.8231, Kinh độ: 106.6297 (Mock HCM City)".into())
}
