@echo off
color 0A
title Build & Package Security System

echo ===================================================
echo   DANG BUILD SECURITY SYSTEM... Vui long doi...
echo ===================================================

echo.
echo [1/4] Dang bien dich Rust Services (main_service, watchdog)...
cd 1_windows_service
cargo build --release
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo Lỗi khi build Rust Services!
    pause
    exit /B 1
)
cd ..

echo.
echo [2/4] Dang bien dich ung dung PC UI (Tauri)...
cd 2_pc_ui_app
call npm run tauri build
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo Lỗi khi build PC UI!
    pause
    exit /B 1
)
cd ..

echo.
echo [3/4] Dang gom cac file da build vao thu muc "release"...
if exist "release" rmdir /S /Q "release"
mkdir release

copy /Y "1_windows_service\target\release\main_service.exe" "release\main_service.exe" >nul
copy /Y "1_windows_service\target\release\watchdog.exe" "release\watchdog.exe" >nul
copy /Y "2_pc_ui_app\src-tauri\target\release\Security.exe" "release\Security.exe" >nul

echo.
echo [4/4] Dang dong goi thanh file Security_Installer.zip...
if exist "Security_Installer.zip" del /F /Q "Security_Installer.zip"
powershell -Command "Compress-Archive -Path 'release', 'installer' -DestinationPath 'Security_Installer.zip' -Force"

echo ===================================================
echo   HOAN TAT! File cai dat da duoc tao: Security_Installer.zip
echo ===================================================
pause
