# 🛡️ Security System: Service

This module is the core engine of the Security System. It is written in Rust and runs as a persistent background service on Windows (`NT AUTHORITY\SYSTEM`).

## Features
- **Hardware Control**: Monitors and manages USB devices by altering Windows Registry keys.
- **Stealth Monitoring**: Accesses the webcam to take silent snapshots using the Windows Media Foundation API (`escapi`).
- **Process Protection**: Automatically protects itself from unauthorized termination via an external watchdog process.
- **Cloud Connectivity**: Establishes a persistent, encrypted WebSocket connection with the Cloud Relay using `rust-socketio`.
- **OTA Updates**: Operates alongside an update mechanism to allow seamless hot-swapping of its binaries.

## Building
```bash
cargo build --release
```
*Note: Ensure you have the `x86_64-pc-windows-msvc` toolchain installed via rustup.*
