@echo off
title Anti-Theft System Master Launcher
echo ====================================================
echo   ANTI-THEFT SECURITY SYSTEM - STARTING SUITE
echo ====================================================

echo.
echo [+] Dang khoi dong cac dich vu vao cac tab rieng biet (Windows Terminal)...
echo.

:: Chạy lệnh Windows Terminal (wt) để gom tất cả vào các thẻ (tabs) mới trên cùng một cửa sổ
:: Sử dụng -w 0 để cố gắng ép mở tab ngay trên cửa sổ hiện tại (nếu đang dùng Windows Terminal)
wt -w 0 new-tab --title "4. Cloud Relay" -d "%CD%\4_cloud_relay" cmd /k "if not exist node_modules (call npm install) & call npm run dev" ^; ^
new-tab --title "1. Windows Service" -d "%CD%\1_windows_service" cmd /k "echo --- Rust Service Core starting --- & cargo run --bin main_service -- --dev" ^; ^
new-tab --title "2. PC UI App" -d "%CD%\2_pc_ui_app" cmd /k "if not exist node_modules (call npm install) & echo --- Launching Tauri Dev --- & call npm run tauri dev" ^; ^
new-tab --title "3. Mobile App" -d "%CD%\3_mobile_app" cmd /k "if not exist node_modules (call npm install) & echo --- Launching Metro Bundler --- & call npm start"

:: Nếu lệnh trên lỗi (ví dụ file bat chạy ở ngoài cmd thuần, không thuộc WT), mở WT thành cửa sổ mới
if %ERRORLEVEL% NEQ 0 (
    wt new-tab --title "4. Cloud Relay" -d "%CD%\4_cloud_relay" cmd /k "if not exist node_modules (call npm install) & call npm run dev" ^; ^
    new-tab --title "1. Windows Service" -d "%CD%\1_windows_service" cmd /k "echo --- Rust Service Core starting --- & cargo run --bin main_service -- --dev" ^; ^
    new-tab --title "2. PC UI App" -d "%CD%\2_pc_ui_app" cmd /k "if not exist node_modules (call npm install) & echo --- Launching Tauri Dev --- & call npm run tauri dev" ^; ^
    new-tab --title "3. Mobile App" -d "%CD%\3_mobile_app" cmd /k "if not exist node_modules (call npm install) & echo --- Launching Metro Bundler --- & call npm start"
)

echo ====================================================
echo   DA KICH HOAT THANH CONG!
echo   Hay kiem tra cac tab moi vua duoc tao tren thanh Terminal.
echo ====================================================
pause