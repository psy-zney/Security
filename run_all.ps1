# Script to start all 4 components of the Security project in separate windows

# Function to start a process in a new terminal
function Start-Component {
    param (
        [string]$Path,
        [string]$Title,
        [string]$InstallCmd,
        [string]$RunCmd
    )
    
    $FullCommand = "cd '$Path'; "
    if ($InstallCmd) {
        $FullCommand += "Write-Host '--- Installing dependencies for $Title ---' -ForegroundColor Cyan; $InstallCmd; "
    }
    $FullCommand += "Write-Host '--- Starting $Title ---' -ForegroundColor Green; $RunCmd"
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "title $Title; $FullCommand"
}

# 1. Windows Service (Rust)
Start-Component -Path ".\1_windows_service" -Title "1. Windows Service" -InstallCmd "" -RunCmd "cargo run --bin main_service -- --dev"

# 2. PC UI App (React + Tauri)
Start-Component -Path ".\2_pc_ui_app" -Title "2. PC UI App" -InstallCmd "npm install" -RunCmd "npm run tauri dev"

# 3. Mobile App (Expo)
Start-Component -Path ".\3_mobile_app" -Title "3. Mobile App" -InstallCmd "npm install" -RunCmd "npm start"

# 4. Cloud Relay (Node.js)
Start-Component -Path ".\4_cloud_relay" -Title "4. Cloud Relay" -InstallCmd "npm install" -RunCmd "npm run dev"
