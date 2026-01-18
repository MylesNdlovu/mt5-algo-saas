# Scalperium Agent Windows Service Uninstaller
# Run as Administrator

$ServiceName = "ScalperiumAgent"

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    exit 1
}

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "Service '$ServiceName' not found" -ForegroundColor Yellow
    exit 0
}

Write-Host "Stopping service..." -ForegroundColor Yellow
Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Removing service..." -ForegroundColor Yellow
sc.exe delete $ServiceName

Write-Host "Service removed successfully" -ForegroundColor Green
