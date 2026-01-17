# Build All-in-One Scalperium Installer
# Creates a single portable installer with C# Agent + WebSocket Server
# Run on Windows with PowerShell as Administrator

param(
    [string]$NodeVersion = "20.10.0",
    [switch]$SkipNodeDownload
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$WebSocketDir = Join-Path $RootDir "websocket-server"
$OutputDir = Join-Path $ScriptDir "output"
$BundleDir = Join-Path $ScriptDir "bundle"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Scalperium All-in-One Installer Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create directories
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path $BundleDir | Out-Null
New-Item -ItemType Directory -Force -Path "$BundleDir\nodejs" | Out-Null
New-Item -ItemType Directory -Force -Path "$BundleDir\wsserver" | Out-Null

# Step 1: Build C# Agent
Write-Host "`n[1/5] Building C# Agent..." -ForegroundColor Yellow
Push-Location $RootDir
dotnet publish src/MT5Agent.Service/MT5Agent.Service.csproj -c Release -r win-x64 --self-contained -o "$ScriptDir\bin\Release\net8.0-windows\publish"
Pop-Location
Write-Host "  C# Agent built successfully" -ForegroundColor Green

# Step 2: Download Node.js portable (Windows x64)
if (-not $SkipNodeDownload) {
    Write-Host "`n[2/5] Downloading Node.js $NodeVersion portable..." -ForegroundColor Yellow
    $NodeZip = Join-Path $BundleDir "node.zip"
    $NodeUrl = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip"

    if (-not (Test-Path $NodeZip)) {
        Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeZip
    }

    # Extract Node.js
    Expand-Archive -Path $NodeZip -DestinationPath $BundleDir -Force
    $ExtractedDir = Get-ChildItem -Path $BundleDir -Directory | Where-Object { $_.Name -like "node-v*" } | Select-Object -First 1
    if ($ExtractedDir) {
        Copy-Item -Path (Join-Path $ExtractedDir.FullName "*") -Destination "$BundleDir\nodejs" -Recurse -Force
        Remove-Item -Path $ExtractedDir.FullName -Recurse -Force
    }
    Write-Host "  Node.js extracted to bundle\nodejs" -ForegroundColor Green
} else {
    Write-Host "`n[2/5] Skipping Node.js download (using existing)" -ForegroundColor Yellow
}

# Step 3: Prepare WebSocket Server
Write-Host "`n[3/5] Preparing WebSocket Server..." -ForegroundColor Yellow
Push-Location $WebSocketDir

# Install dependencies
npm install --omit=dev

# Copy to bundle
Copy-Item -Path "server.js" -Destination "$BundleDir\wsserver\" -Force
Copy-Item -Path "package.json" -Destination "$BundleDir\wsserver\" -Force
Copy-Item -Path "node_modules" -Destination "$BundleDir\wsserver\node_modules" -Recurse -Force
Copy-Item -Path "prisma" -Destination "$BundleDir\wsserver\prisma" -Recurse -Force

Pop-Location
Write-Host "  WebSocket Server prepared" -ForegroundColor Green

# Step 4: Copy MQL5 files
Write-Host "`n[4/5] Copying MQL5 files..." -ForegroundColor Yellow
$Mql5Src = Join-Path $RootDir "mql5"
$Mql5Dst = Join-Path $BundleDir "mql5"
if (Test-Path $Mql5Src) {
    Copy-Item -Path $Mql5Src -Destination $Mql5Dst -Recurse -Force
    Write-Host "  MQL5 files copied" -ForegroundColor Green
} else {
    New-Item -ItemType Directory -Force -Path $Mql5Dst | Out-Null
    Write-Host "  MQL5 folder created (empty)" -ForegroundColor Yellow
}

# Step 5: Compile Inno Setup installer
Write-Host "`n[5/5] Compiling Inno Setup installer..." -ForegroundColor Yellow
$InnoCompiler = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $InnoCompiler)) {
    $InnoCompiler = "C:\Program Files\Inno Setup 6\ISCC.exe"
}

if (Test-Path $InnoCompiler) {
    & $InnoCompiler "$ScriptDir\MT5AgentSetup-AllInOne.iss"
    Write-Host "  Installer compiled successfully" -ForegroundColor Green
} else {
    Write-Host "  Inno Setup not found at:" -ForegroundColor Red
    Write-Host "    C:\Program Files (x86)\Inno Setup 6\ISCC.exe" -ForegroundColor Red
    Write-Host "    C:\Program Files\Inno Setup 6\ISCC.exe" -ForegroundColor Red
    Write-Host "  Please install Inno Setup 6 or compile manually." -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Bundle size:"
Get-ChildItem -Path $BundleDir -Recurse | Measure-Object -Property Length -Sum | ForEach-Object { "  Total: {0:N2} MB" -f ($_.Sum / 1MB) }
Write-Host "`nInstaller: $OutputDir\ScalperiumSetup-1.0.0.exe"
