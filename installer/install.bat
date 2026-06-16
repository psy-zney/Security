@echo off
color 0B
title Cai dat Security System

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
echo   DANG CAI DAT SECURITY SYSTEM...
echo ===================================================

:: 2. Dừng và xóa Service cũ (nếu có)
echo [1/5] Dang dung va go bo dich vu cu...
sc stop SecurityWatchdog >nul 2>&1
sc stop SecurityService >nul 2>&1
timeout /t 2 /nobreak >nul
taskkill /F /IM watchdog.exe >nul 2>&1
taskkill /F /IM main_service.exe >nul 2>&1
taskkill /F /IM Security.exe >nul 2>&1
sc delete SecurityWatchdog >nul 2>&1
sc delete SecurityService >nul 2>&1

:: 3. Copy file he thong
echo [2/5] Dang sao chep tap tin vao he thong...
mkdir "C:\Program Files\SecuritySystem" 2>nul
copy /y "..\release\main_service.exe" "C:\Program Files\SecuritySystem\main_service.exe" >nul
copy /y "..\release\watchdog.exe" "C:\Program Files\SecuritySystem\watchdog.exe" >nul
copy /y "..\release\Security.exe" "C:\Program Files\SecuritySystem\Security.exe" >nul

:: 4. Dang ky va chay Windows Services
echo [3/5] Dang dang ky va khoi dong he thong bao ve ngam...
sc create SecurityService binPath= "C:\Program Files\SecuritySystem\main_service.exe" start= auto >nul
sc create SecurityWatchdog binPath= "C:\Program Files\SecuritySystem\watchdog.exe" start= auto >nul
sc start SecurityService >nul
sc start SecurityWatchdog >nul

:: 4. Cấu hình file mã hóa kết nối Cloud
echo [4/5] Dang cau hinh ket noi Cloud an toan...
powershell -Command "Add-Type -AssemblyName System.Security; $bytes = [byte[]]::new(32); [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); $randKey = -join ($bytes | ForEach-Object { '{0:x2}' -f $_ }); $configJson = '{\"RELAY_URL\":\"https://security-relay.onrender.com\",\"SECRET_KEY\":\"' + $randKey + '\"}'; $dataBytes = [System.Text.Encoding]::UTF8.GetBytes($configJson); $scope = [System.Security.Cryptography.DataProtectionScope]::LocalMachine; $encryptedBytes = [System.Security.Cryptography.ProtectedData]::Protect($dataBytes, $null, $scope); $base64String = [System.Convert]::ToBase64String($encryptedBytes); New-Item -ItemType Directory -Force -Path 'C:\ProgramData\SecuritySystem' > $null; [System.IO.File]::WriteAllText('C:\ProgramData\SecuritySystem\config.enc', $base64String);"

:: 5. Tạo Shortcut ngoài Desktop cho ứng dụng UI
echo [5/5] Dang tao Shortcut 'Security' ngoai Desktop...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut(\"$Home\Desktop\Security.lnk\"); $Shortcut.TargetPath = 'C:\Program Files\SecuritySystem\Security.exe'; $Shortcut.WorkingDirectory = 'C:\Program Files\SecuritySystem'; $Shortcut.Save()"

echo Hoan tat cai dat! Dang mo ung dung...
start "" "C:\Program Files\SecuritySystem\Security.exe"
exit
