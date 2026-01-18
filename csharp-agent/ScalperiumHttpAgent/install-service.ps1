# Scalperium Agent Windows Service Installer
# Run as Administrator

$ServiceName = "ScalperiumAgent"
$ServiceDisplayName = "Scalperium MT5 Agent"
$ServiceDescription = "Auto-provisions and manages MT5 terminals for Scalperium trading platform"
$AgentPath = "$PSScriptRoot\ScalperiumHttpAgent.exe"

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Check if agent exe exists
if (-not (Test-Path $AgentPath)) {
    Write-Host "ERROR: Agent not found at: $AgentPath" -ForegroundColor Red
    exit 1
}

# Stop existing service if running
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Stopping existing service..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    Write-Host "Removing existing service..." -ForegroundColor Yellow
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
}

# Create the service using sc.exe
Write-Host "Creating Windows Service..." -ForegroundColor Cyan

# Create wrapper batch file that sets working directory
$WrapperPath = "$PSScriptRoot\run-agent.bat"
$WrapperContent = @"
@echo off
cd /d "$PSScriptRoot"
"$AgentPath"
"@
Set-Content -Path $WrapperPath -Value $WrapperContent

# Use NSSM for better service management (if available) or fallback to sc.exe
$nssmPath = "C:\nssm\nssm.exe"
if (Test-Path $nssmPath) {
    Write-Host "Using NSSM for service installation..." -ForegroundColor Green
    & $nssmPath install $ServiceName $AgentPath
    & $nssmPath set $ServiceName AppDirectory $PSScriptRoot
    & $nssmPath set $ServiceName DisplayName $ServiceDisplayName
    & $nssmPath set $ServiceName Description $ServiceDescription
    & $nssmPath set $ServiceName Start SERVICE_AUTO_START
    & $nssmPath set $ServiceName AppStdout "$PSScriptRoot\logs\stdout.log"
    & $nssmPath set $ServiceName AppStderr "$PSScriptRoot\logs\stderr.log"
    & $nssmPath set $ServiceName AppRotateFiles 1
    & $nssmPath set $ServiceName AppRotateBytes 10485760
} else {
    Write-Host "Using sc.exe for service installation..." -ForegroundColor Green
    Write-Host "(For better logging, install NSSM: https://nssm.cc/download)" -ForegroundColor Gray

    # Create service
    sc.exe create $ServiceName binPath= "`"$WrapperPath`"" DisplayName= "$ServiceDisplayName" start= auto
    sc.exe description $ServiceName "$ServiceDescription"
    sc.exe failure $ServiceName reset= 86400 actions= restart/60000/restart/60000/restart/60000
}

# Create logs directory
$logsDir = "$PSScriptRoot\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Start the service
Write-Host "Starting service..." -ForegroundColor Cyan
Start-Service -Name $ServiceName

# Check status
Start-Sleep -Seconds 3
$service = Get-Service -Name $ServiceName
if ($service.Status -eq 'Running') {
    Write-Host ""
    Write-Host "SUCCESS! Scalperium Agent is now running as a Windows Service" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Name: $ServiceName" -ForegroundColor Cyan
    Write-Host "Status: Running" -ForegroundColor Green
    Write-Host "Startup: Automatic (starts on boot)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  Stop:    Stop-Service $ServiceName" -ForegroundColor Gray
    Write-Host "  Start:   Start-Service $ServiceName" -ForegroundColor Gray
    Write-Host "  Status:  Get-Service $ServiceName" -ForegroundColor Gray
    Write-Host "  Remove:  sc.exe delete $ServiceName" -ForegroundColor Gray
} else {
    Write-Host "WARNING: Service created but may not be running" -ForegroundColor Yellow
    Write-Host "Status: $($service.Status)" -ForegroundColor Yellow
    Write-Host "Check logs at: $logsDir" -ForegroundColor Gray
}
