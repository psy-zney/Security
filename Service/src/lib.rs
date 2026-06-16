pub mod ipc;
pub mod system_ops;

use std::sync::atomic::AtomicBool;
use std::sync::Mutex;

pub static SERVICE_PAUSED: AtomicBool = AtomicBool::new(false);
pub static KILL_OTP: Mutex<Option<String>> = Mutex::new(None);
