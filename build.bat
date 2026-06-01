@echo off
color 0B
title Build Security Core System

echo ===================================================
echo   DANG BIEN DICH HE THONG SECURITY...
echo ===================================================

:: 1. Build Windows Service (Rust)
echo [1/2] Dang bien dich Windows Service (Rust)...
cd 1_windows_service
cargo build --release
if %errorlevel% neq 0 (
    echo [ERROR] Bien dich Windows Service that bai!
    pause
    exit /b %errorlevel%
)
copy /y "target\release\main_service.exe" "..\release\" >nul
copy /y "target\release\watchdog.exe" "..\release\" >nul

:: 2. Build PC UI App (Tauri)
echo [2/2] Dang bien dich PC UI App (Tauri)...
cd ..\2_pc_ui_app
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build Frontend PC UI App that bai!
    pause
    exit /b %errorlevel%
)
cd src-tauri
cargo build --release
if %errorlevel% neq 0 (
    echo [ERROR] Bien dich Tauri Backend that bai!
    pause
    exit /b %errorlevel%
)
copy /y "target\release\SecurityApp.exe" "..\..\release\" >nul

echo ===================================================
echo   HOAN TAT! Tat ca file exe da duoc copy vao release/
echo ===================================================
cd ..\..
pause
