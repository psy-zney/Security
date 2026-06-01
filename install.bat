@echo off
color 0A
title Cai dat Security Core System

:: 1. Tự động yêu cầu quyền Quản trị viên (Run as Administrator)
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Dang yeu cau quyen Administrator de cai dat dich vu he thong...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

echo ===================================================
echo   DANG CAI DAT SECURITY CORE SYSTEM...
echo ===================================================

:: 2. Copy file he thong
echo [1/4] Dang sao chep tap tin vao he thong...
mkdir "C:\Program Files\SecuritySystem" 2>nul
copy /y "main_service.exe" "C:\Program Files\SecuritySystem\main_service.exe" >nul
copy /y "watchdog.exe" "C:\Program Files\SecuritySystem\watchdog.exe" >nul
copy /y "tauri-app.exe" "C:\Program Files\SecuritySystem\tauri-app.exe" >nul

:: 3. Dang ky va chay Windows Services
echo [2/4] Dang dang ky he thong bao ve ngam...
sc stop SecurityService >nul 2>&1
sc stop SecurityWatchdog >nul 2>&1
sc delete SecurityService >nul 2>&1
sc delete SecurityWatchdog >nul 2>&1

sc create SecurityService binPath= "C:\Program Files\SecuritySystem\main_service.exe" start= auto >nul
sc create SecurityWatchdog binPath= "C:\Program Files\SecuritySystem\watchdog.exe" start= auto >nul

echo [3/4] Dang khoi dong dich vu...
sc start SecurityService >nul
sc start SecurityWatchdog >nul

:: 4. Tự động cấu hình file mã hóa (Không cần khách hàng nhập tay)
echo [4/4] Dang cau hinh ket noi Cloud an toan...
powershell -Command "Add-Type -AssemblyName System.Security; $configJson = '{\"RELAY_URL\":\"https://security-relay.onrender.com\",\"SECRET_KEY\":\"d8a6f42b3e70d195f269a847bc83de9ef0a41d726b91a58c0df1bde7f4019e2c\"}'; $dataBytes = [System.Text.Encoding]::UTF8.GetBytes($configJson); $scope = [System.Security.Cryptography.DataProtectionScope]::LocalMachine; $encryptedBytes = [System.Security.Cryptography.ProtectedData]::Protect($dataBytes, $null, $scope); $base64String = [System.Convert]::ToBase64String($encryptedBytes); New-Item -ItemType Directory -Force -Path 'C:\ProgramData\SecuritySystem' > $null; [System.IO.File]::WriteAllText('C:\ProgramData\SecuritySystem\config.enc', $base64String);"

:: 5. Mo ung dung UI cho khach hang
echo Hoan tat cai dat! Dang mo ung dung...
start "" "C:\Program Files\SecuritySystem\tauri-app.exe"
exit
