# SCALPERIUM MT5 Agent Build Script
# PowerShell script to build and package the agent

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    SCALPERIUM MT5 Agent Builder       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check for .NET SDK
Write-Host "Checking for .NET SDK..." -ForegroundColor Yellow
$dotnetVersion = dotnet --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ .NET SDK not found. Please install .NET 6.0 or later." -ForegroundColor Red
    Write-Host "Download from: https://dotnet.microsoft.com/download" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ .NET SDK $dotnetVersion found" -ForegroundColor Green

# Navigate to project directory
Set-Location -Path "$PSScriptRoot\MT5AgentAPI"

# Restore dependencies
Write-Host "`nRestoring NuGet packages..." -ForegroundColor Yellow
dotnet restore
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to restore packages" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Packages restored" -ForegroundColor Green

# Build Release configuration
Write-Host "`nBuilding Release configuration..." -ForegroundColor Yellow
dotnet build -c Release
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build successful" -ForegroundColor Green

# Publish self-contained executable
Write-Host "`nPublishing self-contained executable..." -ForegroundColor Yellow
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o ./publish
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Publish failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Published to ./publish" -ForegroundColor Green

# Create deployment package
Write-Host "`nCreating deployment package..." -ForegroundColor Yellow
$packageName = "SCALPERIUM-MT5-Agent-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
Compress-Archive -Path ./publish/* -DestinationPath "../$packageName" -Force
Write-Host "✓ Package created: $packageName" -ForegroundColor Green

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         BUILD COMPLETE! ✓              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host "`nExecutable location: $PSScriptRoot\MT5AgentAPI\publish\MT5Agent.exe" -ForegroundColor Cyan
Write-Host "Deployment package: $PSScriptRoot\$packageName" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Set environment variable: `$env:SCALPERIUM_API_KEY = 'your-key'" -ForegroundColor White
Write-Host "2. Run: .\MT5AgentAPI\publish\MT5Agent.exe" -ForegroundColor White
Write-Host "3. Or deploy package to Windows VPS" -ForegroundColor White
