# ============================================================================
# Deploy-MT5-Terminals.ps1
# Automated deployment of 6-10 portable MT5 terminals on Prime VPS
# ============================================================================

param(
    [int]$TerminalCount = 6,
    [string]$InstallPath = "C:\MT5-Terminals",
    [string]$MT5InstallerUrl = "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe",
    [switch]$SkipDownload,
    [switch]$Verbose
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Terminal naming convention
$TerminalPrefix = "MT5-Terminal"

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch($Level) {
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-SystemResources {
    $os = Get-CimInstance Win32_OperatingSystem
    $cpu = Get-CimInstance Win32_Processor

    $totalRAM = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    $freeRAM = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    $usedRAM = $totalRAM - $freeRAM

    return @{
        TotalRAM = $totalRAM
        FreeRAM = $freeRAM
        UsedRAM = $usedRAM
        CPUCores = $cpu.NumberOfCores
        CPUThreads = $cpu.NumberOfLogicalProcessors
    }
}

function Test-ResourceAvailability {
    param([int]$RequestedTerminals)

    $resources = Get-SystemResources
    $requiredRAM = 5.3 + ($RequestedTerminals * 1.2) # Base overhead + terminals

    Write-Log "System Resources:" "INFO"
    Write-Log "  Total RAM: $($resources.TotalRAM) GB" "INFO"
    Write-Log "  Free RAM: $($resources.FreeRAM) GB" "INFO"
    Write-Log "  CPU Cores: $($resources.CPUCores)" "INFO"
    Write-Log "  Required RAM for $RequestedTerminals terminals: $requiredRAM GB" "INFO"

    if ($resources.FreeRAM -lt $requiredRAM) {
        Write-Log "WARNING: Insufficient RAM. Available: $($resources.FreeRAM) GB, Required: $requiredRAM GB" "WARNING"
        Write-Log "Maximum safe terminal count: $([math]::Floor(($resources.FreeRAM - 5.3) / 1.2))" "WARNING"
        return $false
    }

    return $true
}

function Download-MT5Installer {
    param([string]$OutputPath)

    Write-Log "Downloading MT5 installer from MQL5..." "INFO"

    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($MT5InstallerUrl, $OutputPath)
        Write-Log "Download complete: $OutputPath" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "Failed to download MT5 installer: $_" "ERROR"
        return $false
    }
}

function Install-BaseMT5 {
    param([string]$InstallerPath, [string]$DestinationPath)

    Write-Log "Installing base MT5 terminal to: $DestinationPath" "INFO"

    # Create silent installation
    $installArgs = @(
        "/auto",
        "/path:$DestinationPath"
    )

    try {
        Start-Process -FilePath $InstallerPath -ArgumentList $installArgs -Wait -NoNewWindow
        Write-Log "Base MT5 installation complete" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "Failed to install base MT5: $_" "ERROR"
        return $false
    }
}

function Copy-PortableTerminal {
    param(
        [string]$SourcePath,
        [string]$DestinationPath,
        [int]$TerminalNumber
    )

    Write-Log "Creating portable terminal $TerminalNumber..." "INFO"

    try {
        # Copy entire MT5 directory
        Copy-Item -Path $SourcePath -Destination $DestinationPath -Recurse -Force

        # Create portable.txt to enable portable mode
        $portableFile = Join-Path $DestinationPath "portable.txt"
        Set-Content -Path $portableFile -Value "Portable Mode Enabled"

        # Create desktop shortcut
        $shortcutPath = [Environment]::GetFolderPath("Desktop") + "\MT5-Terminal-$TerminalNumber.lnk"
        $wshell = New-Object -ComObject WScript.Shell
        $shortcut = $wshell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = Join-Path $DestinationPath "terminal64.exe"
        $shortcut.WorkingDirectory = $DestinationPath
        $shortcut.Description = "MT5 Terminal $TerminalNumber"
        $shortcut.Save()

        Write-Log "Terminal $TerminalNumber created successfully" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "Failed to create terminal $TerminalNumber: $_" "ERROR"
        return $false
    }
}

function Create-TerminalConfig {
    param(
        [string]$TerminalPath,
        [int]$TerminalNumber,
        [hashtable]$BrokerConfig
    )

    $configPath = Join-Path $TerminalPath "config\common.ini"
    $configDir = Split-Path $configPath -Parent

    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }

    # Create basic config
    $configContent = @"
[Common]
Login=$($BrokerConfig.Login)
Password=$($BrokerConfig.Password)
Server=$($BrokerConfig.Server)
ProxyEnable=false
News=false
AutoConfiguration=true
KeepPrivate=false

[Charts]
MaxBarsHistory=5000
PrintColor=false
SaveDeletedCharts=false

[Experts]
Enabled=true
AllowLiveTrading=true
AllowDllImports=true
Enabled=true
Account=$($BrokerConfig.Login)
"@

    Set-Content -Path $configPath -Value $configContent
    Write-Log "Configuration created for terminal $TerminalNumber" "INFO"
}

function Install-TradeCopier {
    param(
        [string]$TerminalPath,
        [int]$TerminalNumber,
        [string]$CopierType = "SERVER" # CLIENT or SERVER
    )

    Write-Log "Installing Trade Copier ($CopierType) for terminal $TerminalNumber..." "INFO"

    $expertsPath = Join-Path $TerminalPath "MQL5\Experts"

    if (-not (Test-Path $expertsPath)) {
        New-Item -ItemType Directory -Path $expertsPath -Force | Out-Null
    }

    # Note: User must manually download from MQL5 Market first
    Write-Log "NOTE: Trade Copier must be downloaded from MQL5 Market" "WARNING"
    Write-Log "  1. Login to MT5 with MQL5 account" "WARNING"
    Write-Log "  2. Go to Toolbox -> Market -> My Products" "WARNING"
    Write-Log "  3. Install 'Local Trade Copier EA MT5'" "WARNING"

    return $true
}

function Create-StartupScript {
    param([string]$InstallPath, [int]$TerminalCount)

    $startupScriptPath = Join-Path $InstallPath "Start-All-Terminals.ps1"

    $scriptContent = @"
# Start All MT5 Terminals
`$ErrorActionPreference = "Continue"

Write-Host "Starting $TerminalCount MT5 terminals..." -ForegroundColor Cyan

for (`$i = 1; `$i -le $TerminalCount; `$i++) {
    `$terminalPath = "C:\MT5-Terminals\MT5-Terminal-`$i\terminal64.exe"

    if (Test-Path `$terminalPath) {
        Write-Host "Starting Terminal `$i..." -ForegroundColor Green
        Start-Process -FilePath `$terminalPath
        Start-Sleep -Seconds 3
    }
    else {
        Write-Host "Terminal `$i not found at: `$terminalPath" -ForegroundColor Red
    }
}

Write-Host "`nAll terminals started! Check resource monitor." -ForegroundColor Green
"@

    Set-Content -Path $startupScriptPath -Value $scriptContent
    Write-Log "Startup script created: $startupScriptPath" "SUCCESS"

    # Create stop script too
    $stopScriptPath = Join-Path $InstallPath "Stop-All-Terminals.ps1"
    $stopScriptContent = @"
# Stop All MT5 Terminals
Write-Host "Stopping all MT5 terminals..." -ForegroundColor Yellow
Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "All terminals stopped." -ForegroundColor Green
"@

    Set-Content -Path $stopScriptPath -Value $stopScriptContent
    Write-Log "Stop script created: $stopScriptPath" "SUCCESS"
}

function Create-ResourceMonitorConfig {
    param([string]$InstallPath, [int]$TerminalCount)

    $configPath = Join-Path $InstallPath "ResourceMonitor.json"

    $config = @{
        TerminalCount = $TerminalCount
        InstallPath = $InstallPath
        Thresholds = @{
            MaxRAMUsagePercent = 80
            MaxCPUUsagePercent = 85
            WarningRAMPercent = 70
            WarningCPUPercent = 75
        }
        RefreshIntervalSeconds = 5
        AlertOnHighUsage = $true
    }

    $config | ConvertTo-Json -Depth 4 | Set-Content -Path $configPath
    Write-Log "Resource monitor config created: $configPath" "SUCCESS"
}

# ============================================================================
# Main Deployment Logic
# ============================================================================

function Start-Deployment {
    Write-Log "===========================================================" "INFO"
    Write-Log "MT5 Terminal Deployment Script" "INFO"
    Write-Log "Target: $TerminalCount portable terminals" "INFO"
    Write-Log "Install Path: $InstallPath" "INFO"
    Write-Log "===========================================================" "INFO"

    # Step 1: Check administrator privileges
    if (-not (Test-Administrator)) {
        Write-Log "ERROR: This script requires Administrator privileges" "ERROR"
        Write-Log "Please run PowerShell as Administrator and try again" "ERROR"
        exit 1
    }

    # Step 2: Check system resources
    Write-Log "Checking system resources..." "INFO"
    if (-not (Test-ResourceAvailability -RequestedTerminals $TerminalCount)) {
        $response = Read-Host "Continue anyway? (y/N)"
        if ($response -ne 'y') {
            Write-Log "Deployment cancelled by user" "WARNING"
            exit 0
        }
    }

    # Step 3: Create base directory
    if (-not (Test-Path $InstallPath)) {
        Write-Log "Creating installation directory: $InstallPath" "INFO"
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    }

    # Step 4: Download MT5 installer (if needed)
    $installerPath = Join-Path $env:TEMP "mt5setup.exe"

    if (-not $SkipDownload) {
        if (-not (Download-MT5Installer -OutputPath $installerPath)) {
            Write-Log "Failed to download MT5 installer" "ERROR"
            exit 1
        }
    }
    else {
        if (-not (Test-Path $installerPath)) {
            Write-Log "Installer not found and -SkipDownload specified" "ERROR"
            exit 1
        }
    }

    # Step 5: Install base MT5 terminal
    $baseMT5Path = Join-Path $InstallPath "MT5-Base"

    if (-not (Test-Path $baseMT5Path)) {
        if (-not (Install-BaseMT5 -InstallerPath $installerPath -DestinationPath $baseMT5Path)) {
            Write-Log "Failed to install base MT5 terminal" "ERROR"
            exit 1
        }

        # Wait for installation to complete
        Write-Log "Waiting for MT5 installation to finalize..." "INFO"
        Start-Sleep -Seconds 10
    }
    else {
        Write-Log "Base MT5 installation already exists, skipping install" "INFO"
    }

    # Step 6: Create portable terminals
    Write-Log "Creating $TerminalCount portable terminals..." "INFO"

    $successCount = 0
    for ($i = 1; $i -le $TerminalCount; $i++) {
        $terminalPath = Join-Path $InstallPath "$TerminalPrefix-$i"

        if (Copy-PortableTerminal -SourcePath $baseMT5Path -DestinationPath $terminalPath -TerminalNumber $i) {
            $successCount++
        }
    }

    Write-Log "$successCount / $TerminalCount terminals created successfully" "SUCCESS"

    # Step 7: Create utility scripts
    Create-StartupScript -InstallPath $InstallPath -TerminalCount $TerminalCount
    Create-ResourceMonitorConfig -InstallPath $InstallPath -TerminalCount $TerminalCount

    # Step 8: Summary
    Write-Log "===========================================================" "SUCCESS"
    Write-Log "Deployment Complete!" "SUCCESS"
    Write-Log "===========================================================" "SUCCESS"
    Write-Log "" "INFO"
    Write-Log "Next Steps:" "INFO"
    Write-Log "1. Run: $InstallPath\Start-All-Terminals.ps1" "INFO"
    Write-Log "2. Login to each terminal with broker credentials" "INFO"
    Write-Log "3. Download Trade Copier from MQL5 Market in each terminal" "INFO"
    Write-Log "4. Configure Master (Terminal 1) with CLIENT EA" "INFO"
    Write-Log "5. Configure Slaves (Terminals 2-$TerminalCount) with SERVER EA" "INFO"
    Write-Log "6. Run C# Resource Monitor to track system health" "INFO"
    Write-Log "" "INFO"
    Write-Log "Scripts created:" "INFO"
    Write-Log "  - Start terminals: $InstallPath\Start-All-Terminals.ps1" "INFO"
    Write-Log "  - Stop terminals: $InstallPath\Stop-All-Terminals.ps1" "INFO"
    Write-Log "  - Monitor config: $InstallPath\ResourceMonitor.json" "INFO"
    Write-Log "===========================================================" "SUCCESS"
}

# Run deployment
Start-Deployment
