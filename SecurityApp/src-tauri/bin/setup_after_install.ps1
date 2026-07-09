param (
    [string]$InstallDir = $PSScriptRoot
)

$ErrorActionPreference = "SilentlyContinue"
$InstallDir = $InstallDir.TrimEnd('\')

# Tạo thư mục dữ liệu và log cài đặt chuyên nghiệp
$LogDir = "C:\ProgramData\SecuritySystem"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogFile = Join-Path $LogDir "install.log"

function Log-Message([string]$msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Out-File -FilePath $LogFile -Append -Encoding UTF8
}

Log-Message "=== Bắt đầu cấu hình tự động Security System MSI ==="
Log-Message "InstallDir: $InstallDir"

# 1. Dừng và dọn dẹp service cũ nếu tồn tại
Log-Message "Dừng service cũ (nếu có)..."
sc.exe stop SecurityWatchdog | Out-Null
sc.exe stop SecurityService | Out-Null
Start-Sleep -Seconds 2
Stop-Process -Name "watchdog" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "main_service" -Force -ErrorAction SilentlyContinue
sc.exe delete SecurityWatchdog | Out-Null
sc.exe delete SecurityService | Out-Null

# 2. Đăng ký Windows Services mới với chế độ tự động chạy cùng Windows (start= auto)
$mainServiceExe = Join-Path $InstallDir "main_service.exe"
$watchdogExe = Join-Path $InstallDir "watchdog.exe"

if (Test-Path $mainServiceExe) {
    Log-Message "Đăng ký SecurityService: $mainServiceExe"
    sc.exe create SecurityService binPath= "`"$mainServiceExe`"" start= auto | Out-Null
    sc.exe description SecurityService "Hệ thống giám sát và bảo vệ thiết bị Security Service" | Out-Null
    sc.exe failure SecurityService reset= 0 actions= restart/5000 | Out-Null
    sc.exe start SecurityService | Out-Null
} else {
    Log-Message "Cảnh báo: Không tìm thấy main_service.exe tại $mainServiceExe"
}

if (Test-Path $watchdogExe) {
    Log-Message "Đăng ký SecurityWatchdog: $watchdogExe"
    sc.exe create SecurityWatchdog binPath= "`"$watchdogExe`"" start= auto | Out-Null
    sc.exe description SecurityWatchdog "Trình giám sát độ tin cậy Security Watchdog" | Out-Null
    sc.exe failure SecurityWatchdog reset= 0 actions= restart/5000 | Out-Null
    sc.exe start SecurityWatchdog | Out-Null
} else {
    Log-Message "Cảnh báo: Không tìm thấy watchdog.exe tại $watchdogExe"
}

# 3. Tạo Shortcut Desktop cho mọi tài khoản trên PC (Public Desktop)
$desktopPath = [System.Environment]::GetFolderPath("CommonDesktopDirectory")
if (-not $desktopPath) {
    $desktopPath = [System.Environment]::GetFolderPath("Desktop")
}

$shortcutPath = Join-Path $desktopPath "SecurityApp.lnk"
$appExe = Join-Path $InstallDir "SecurityApp.exe"

if (Test-Path $appExe) {
    Log-Message "Tạo Desktop Shortcut: $shortcutPath -> $appExe"
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $appExe
    $Shortcut.WorkingDirectory = $InstallDir
    $Shortcut.Description = "Security Control Panel"
    $Shortcut.Save()
}

Log-Message "=== Hoàn tất cài đặt thành công ==="
