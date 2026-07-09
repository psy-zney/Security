$ErrorActionPreference = "SilentlyContinue"

$LogFile = "C:\ProgramData\SecuritySystem\install.log"
function Log-Message([string]$msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] [UNINSTALL] $msg" | Out-File -FilePath $LogFile -Append -Encoding UTF8 -ErrorAction SilentlyContinue
}

Log-Message "=== Kiểm tra xác thực OTP trước khi gỡ cài đặt ==="

$deviceId = $env:COMPUTERNAME
$relayUrl = "https://security-relay.onrender.com"

try {
    # 1. Gửi yêu cầu gỡ cài đặt lên Cloud Server (báo cho điện thoại)
    $bodyJson = @{ deviceId = $deviceId } | ConvertTo-Json -Compress
    $res = Invoke-RestMethod -Uri "$relayUrl/api/uninstall/request-otp" -Method Post -Body $bodyJson -ContentType "application/json" -TimeoutSec 8
    
    if ($res.requiresOtp -eq $true) {
        Log-Message "Thiết bị đang liên kết với điện thoại. Yêu cầu nhập mã OTP..."
        
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        $form = New-Object System.Windows.Forms.Form
        $form.Text = "Bảo Vệ Chống Gỡ Cài Đặt Trái Phép"
        $form.Size = New-Object System.Drawing.Size(420, 230)
        $form.StartPosition = "CenterScreen"
        $form.TopMost = $true
        $form.FormBorderStyle = "FixedDialog"
        $form.MaximizeBox = $false
        $form.MinimizeBox = $false

        $label = New-Object System.Windows.Forms.Label
        $label.Location = New-Object System.Drawing.Point(20, 20)
        $label.Size = New-Object System.Drawing.Size(370, 45)
        $label.Text = "Thiết bị này đang được bảo vệ bởi điện thoại.`nMã OTP 6 số đã được gửi đến ứng dụng trên điện thoại của bạn.`nVui lòng nhập mã OTP để tiếp tục gỡ cài đặt:"
        $form.Controls.Add($label)

        $textBox = New-Object System.Windows.Forms.TextBox
        $textBox.Location = New-Object System.Drawing.Point(20, 75)
        $textBox.Size = New-Object System.Drawing.Size(360, 25)
        $textBox.Font = New-Object System.Drawing.Font("Segoe UI", 11)
        $form.Controls.Add($textBox)

        $btnOk = New-Object System.Windows.Forms.Button
        $btnOk.Location = New-Object System.Drawing.Point(200, 130)
        $btnOk.Size = New-Object System.Drawing.Size(85, 30)
        $btnOk.Text = "Xác nhận"
        $btnOk.DialogResult = [System.Windows.Forms.DialogResult]::OK
        $form.AcceptButton = $btnOk
        $form.Controls.Add($btnOk)

        $btnCancel = New-Object System.Windows.Forms.Button
        $btnCancel.Location = New-Object System.Drawing.Point(295, 130)
        $btnCancel.Size = New-Object System.Drawing.Size(85, 30)
        $btnCancel.Text = "Hủy"
        $btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
        $form.CancelButton = $btnCancel
        $form.Controls.Add($btnCancel)

        $result = $form.ShowDialog()

        if ($result -ne [System.Windows.Forms.DialogResult]::OK -or [string]::IsNullOrWhiteSpace($textBox.Text)) {
            Log-Message "Người dùng hủy nhập OTP hoặc để trống. Hủy lệnh gỡ cài đặt!"
            exit 1
        }

        $inputOtp = $textBox.Text.Trim()
        $verifyBody = @{ deviceId = $deviceId; otpCode = $inputOtp } | ConvertTo-Json -Compress
        $verifyRes = Invoke-RestMethod -Uri "$relayUrl/api/uninstall/verify-otp" -Method Post -Body $verifyBody -ContentType "application/json" -TimeoutSec 8

        if ($verifyRes.status -ne "success") {
            [System.Windows.Forms.MessageBox]::Show("Mã OTP không chính xác. Quá trình gỡ cài đặt bị từ chối!", "Lỗi xác thực", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            Log-Message "Xác thực OTP thất bại ($inputOtp)."
            exit 1
        }
        
        Log-Message "Xác thực OTP thành công. Cho phép gỡ cài đặt."
    }
} catch {
    Log-Message "Lỗi hoặc offline khi kiểm tra OTP: $_"
}

# Tiến hành gỡ bỏ dịch vụ
Log-Message "Dừng và gỡ bỏ Windows Services..."
sc.exe stop SecurityWatchdog | Out-Null
sc.exe stop SecurityService | Out-Null
Start-Sleep -Seconds 1
Stop-Process -Name "watchdog" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "main_service" -Force -ErrorAction SilentlyContinue
sc.exe delete SecurityWatchdog | Out-Null
sc.exe delete SecurityService | Out-Null

$desktopPath = [System.Environment]::GetFolderPath("CommonDesktopDirectory")
$shortcutPath = Join-Path $desktopPath "SecurityApp.lnk"
if (Test-Path $shortcutPath) {
    Remove-Item -Force $shortcutPath
}

Log-Message "Đã gỡ hoàn toàn dịch vụ và shortcut khỏi Windows."
