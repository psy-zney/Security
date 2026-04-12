use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub enum SecureCommand {
    ChangePassword {
        username: String,
        new_password: String,
        pin: String,
    },
    LockUsb,
    UnlockUsb,
    CaptureImage,
    GetLocation,
    GetIp,
    // Lệnh Ping để kiểm tra trạng thái sống
    Ping,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum CommandResponse {
    Success { message: String },
    Data { payload: String },
    Error { message: String },
}
