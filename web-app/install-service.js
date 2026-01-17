// Windows Service Installer for Scalperium Web Server
// Uses sc.exe with a wrapper batch file

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = path.dirname(__filename);
const nodeDir = path.join(path.dirname(appDir), 'NodeJS');
const nodePath = path.join(nodeDir, 'node.exe');
const serverPath = path.join(appDir, 'server.js');
const wrapperPath = path.join(appDir, 'start-server.bat');
const logPath = path.join(appDir, 'Logs');

// Create logs directory
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath, { recursive: true });
}

// Create wrapper batch file
const batchContent = `@echo off
cd /d "${appDir}"
"${nodePath}" "${serverPath}" >> "${path.join(logPath, 'server.log')}" 2>&1
`;

fs.writeFileSync(wrapperPath, batchContent);
console.log(`Created wrapper: ${wrapperPath}`);

// For a proper Windows service, we'll create a PowerShell script
// that uses NSSM or Task Scheduler
const psScript = `
# Scalperium Web Server Service Setup
# Run this script as Administrator

$serviceName = "ScalperiumWebServer"
$displayName = "Scalperium Web Server"
$description = "Runs the Scalperium web application with WebSocket server"
$nodePath = "${nodePath.replace(/\\/g, '\\\\')}"
$serverPath = "${serverPath.replace(/\\/g, '\\\\')}"
$workingDir = "${appDir.replace(/\\/g, '\\\\')}"

# Check if NSSM is available (preferred method)
$nssmPath = Join-Path $env:TEMP "nssm.exe"
$nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"

# Download NSSM if not present
if (-not (Test-Path $nssmPath)) {
    Write-Host "Downloading NSSM..."
    $zipPath = Join-Path $env:TEMP "nssm.zip"
    Invoke-WebRequest -Uri $nssmUrl -OutFile $zipPath
    Expand-Archive -Path $zipPath -DestinationPath $env:TEMP -Force
    Copy-Item (Join-Path $env:TEMP "nssm-2.24\\win64\\nssm.exe") $nssmPath
}

# Install service using NSSM
Write-Host "Installing $displayName service..."
& $nssmPath install $serviceName $nodePath $serverPath
& $nssmPath set $serviceName AppDirectory $workingDir
& $nssmPath set $serviceName DisplayName $displayName
& $nssmPath set $serviceName Description $description
& $nssmPath set $serviceName Start SERVICE_AUTO_START
& $nssmPath set $serviceName AppStdout (Join-Path $workingDir "Logs\\stdout.log")
& $nssmPath set $serviceName AppStderr (Join-Path $workingDir "Logs\\stderr.log")
& $nssmPath set $serviceName AppRotateFiles 1
& $nssmPath set $serviceName AppRotateBytes 10485760

Write-Host "Service installed successfully!"
Write-Host "Starting service..."
Start-Service $serviceName
Write-Host "Done!"
`;

const psPath = path.join(appDir, 'install-service.ps1');
fs.writeFileSync(psPath, psScript);
console.log(`Created PowerShell installer: ${psPath}`);

// Try to run the PowerShell script
try {
  console.log('Attempting to install Windows service...');
  execSync(`powershell -ExecutionPolicy Bypass -File "${psPath}"`, { stdio: 'inherit' });
  console.log('Service installed successfully!');
} catch (error) {
  console.log('Auto-install failed. Please run install-service.ps1 as Administrator.');
  console.log(`  PowerShell: ${psPath}`);
}
