# 🖥️ Security System: SecurityApp

This is the local configuration and management dashboard for the Windows machine, built using the Tauri framework (Rust backend + React/TypeScript frontend).

## Features
- **Device Pairing**: Generates a secure QR code containing device identification and encryption keys for seamless pairing with the mobile app.
- **Local Control**: Provides a clean UI with buttons to instantly lock the PC, disable USB ports, or capture stealth photos via IPC (Named Pipes) communication with the background service.
- **Service Management (OTP)**: Generates a random 6-digit OTP that users can input on their Mobile App to securely pause/resume the background service.
- **OTA Updates Client**: Fetches the `version.json` from the Cloud Relay. If a new version exists, it downloads the compiled service binaries and spawns an elevated PowerShell script to automatically install them.

## Development Setup

### Prerequisites
- Node.js (v18+)
- Rust & Cargo
- Visual Studio C++ Build Tools

### Running Locally
```bash
npm install
npm run tauri dev
```

### Building for Release
```bash
npm run tauri build
```
This will compile the frontend and Rust binary into a standalone executable.
