# MT5 Resource Monitor

Real-time Windows desktop application for monitoring MT5 terminal resource usage on VPS/dedicated servers.

## Features

- **Real-time Resource Monitoring**
  - RAM usage (current / total)
  - CPU usage percentage
  - Live charts with 5-minute history

- **MT5 Terminal Management**
  - Auto-detect running terminal64.exe processes
  - Per-terminal RAM and CPU tracking
  - Start new terminals directly from UI
  - Stop all terminals with one click

- **Intelligent Alerts**
  - Visual status indicators (HEALTHY / WARNING / DANGER)
  - Automatic calculation of safe terminal count
  - "Safe to add more?" indicator
  - Color-coded progress bars

- **Beautiful Dark Theme UI**
  - Scalperium branding
  - Clean, modern design
  - Real-time LiveCharts graphs
  - Responsive layout

## Screenshots

### Main Dashboard
- 4 status cards: RAM / CPU / Terminals / System Status
- 2 real-time charts: RAM and CPU history
- Running terminals list with per-process stats

### Settings Dialog
- Configure resource thresholds
- Set refresh interval
- Customize alert levels

## Requirements

- **OS:** Windows Server 2019/2022 or Windows 10/11
- **.NET:** 8.0 SDK or Runtime
- **RAM:** Monitoring overhead ~50MB
- **CPU:** <1% background usage

## Installation

### Option 1: Build from Source

```powershell
# Navigate to project folder
cd C:\path\to\MT5ResourceMonitor

# Restore dependencies
dotnet restore

# Build Release version
dotnet build -c Release

# Run
dotnet run
```

### Option 2: Publish Standalone

```powershell
# Publish self-contained (includes .NET runtime)
dotnet publish -c Release -r win-x64 --self-contained true -o ./publish

# Or framework-dependent (smaller, requires .NET installed)
dotnet publish -c Release -r win-x64 --self-contained false -o ./publish

# Run the .exe
./publish/MT5ResourceMonitor.exe
```

## Configuration

The app looks for configuration in two locations:

1. **Deployed config** (priority): `C:\MT5-Terminals\ResourceMonitor.json`
2. **User config**: `%APPDATA%\MT5ResourceMonitor\config.json`

### Default Configuration

```json
{
  "TerminalCount": 6,
  "InstallPath": "C:\\MT5-Terminals",
  "Thresholds": {
    "MaxRAMUsagePercent": 80.0,
    "MaxCPUUsagePercent": 85.0,
    "WarningRAMPercent": 70.0,
    "WarningCPUPercent": 75.0
  },
  "RefreshIntervalSeconds": 5,
  "AlertOnHighUsage": true,
  "ServerName": "Prime VPS"
}
```

### Customize via Settings

Click the `⚙ Settings` button to modify:
- Server name (display label)
- Expected terminal count
- Installation path
- Refresh interval (1-60 seconds)
- Resource thresholds
- Alert preferences

## Resource Calculations

### RAM Calculation

```
Base Overhead: 5.3 GB
  - Windows Server: ~2.5 GB
  - C# Pool Agent: ~0.5 GB
  - Trade Copier: ~0.3 GB
  - System buffer: ~2 GB

Per Terminal: 1.2 GB
  - MT5 platform: ~800 MB
  - Charts + indicators: ~200 MB
  - EA + buffer: ~200 MB

Max Safe Terminals = (Total RAM × 0.8 - 5.3) / 1.2
```

### Example Calculations

| Server RAM | Max Safe Terminals | Usage at Max |
|------------|-------------------|--------------|
| 12 GB      | 6 terminals       | 75% (9 GB)   |
| 16 GB      | 8 terminals       | 80% (12.8 GB)|
| 32 GB      | 20 terminals      | 80% (25.6 GB)|
| 64 GB      | 40 terminals      | 80% (51.2 GB)|
| 128 GB     | 80 terminals      | 80% (102 GB) |

## Usage

### Monitoring Workflow

1. **Launch Monitor** - Run `MT5ResourceMonitor.exe`
2. **Check Status** - Dashboard shows current resource usage
3. **Add Terminals** - Click "Add New Terminal" when safe
4. **Monitor Alerts** - Watch for WARNING/DANGER status
5. **Adjust Settings** - Configure thresholds as needed

### Status Indicators

| Status | RAM | CPU | Action |
|--------|-----|-----|--------|
| 🟢 HEALTHY | <70% | <75% | Safe to add more |
| 🟡 WARNING | 70-80% | 75-85% | Monitor closely |
| 🔴 DANGER | >80% | >85% | Stop adding, consider removing |

### Chart Interpretation

**RAM Chart (Green):**
- Shows last 5 minutes of RAM usage in GB
- Steady line = stable memory
- Rising line = possible memory leak
- Peaks = terminal startup

**CPU Chart (Blue):**
- Shows last 5 minutes of CPU usage in %
- Baseline 10-30% = normal idle
- Spikes 50-80% = active trading
- Sustained >85% = overload

## Troubleshooting

### Monitor Won't Start

**Error:** "Application failed to start"

**Solution:**
```powershell
# Check .NET is installed
dotnet --version

# If not found, install .NET 8.0:
# https://dotnet.microsoft.com/download/dotnet/8.0
```

### Terminals Not Detected

**Error:** Shows "0 / 6 terminals running"

**Solution:**
- Verify terminals are running: Open Task Manager → Look for `terminal64.exe`
- Check install path in Settings matches actual path
- Restart monitor application

### High Memory Usage Warning

**Status:** Shows RED "DANGER" despite feeling fine

**Solution:**
- Adjust thresholds in Settings
- For 12GB RAM, warning at 70% (8.4GB) is normal with 6 terminals
- Increase thresholds if you're comfortable with higher usage

### Charts Not Updating

**Error:** Flat lines on charts

**Solution:**
- Check refresh interval in Settings (may be too slow)
- Restart application
- Check Windows Performance Counters are enabled

## Development

### Project Structure

```
MT5ResourceMonitor/
├── App.xaml              # Application entry point
├── App.xaml.cs           # Application code-behind
├── MainWindow.xaml       # Main dashboard UI
├── MainWindow.xaml.cs    # Dashboard logic
├── SettingsWindow.xaml   # Settings dialog UI
├── SettingsWindow.xaml.cs# Settings logic
├── ResourceMonitor.cs    # System resource queries
├── MonitorConfig.cs      # Configuration management
└── README.md             # This file
```

### Dependencies

```xml
<PackageReference Include="LiveCharts.Wpf" Version="0.9.7" />
<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
<PackageReference Include="System.Management" Version="8.0.0" />
```

### Building for Release

```powershell
# Clean previous builds
dotnet clean

# Build optimized release
dotnet build -c Release

# Publish standalone (includes .NET)
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o ./publish

# Result: Single .exe file in ./publish/
```

### Adding New Features

**To add a new chart:**
1. Add `CartesianChart` in `MainWindow.xaml`
2. Initialize chart series in `InitializeCharts()`
3. Update data in `UpdateCharts()`

**To add new resource metrics:**
1. Add properties to `SystemResources` class
2. Query data in `ResourceMonitor.GetSystemResources()`
3. Display in dashboard cards

## Performance

- **Memory footprint:** ~50 MB RAM
- **CPU usage:** <1% background, ~2% during refresh
- **Disk usage:** ~15 MB installed
- **Network:** None (local monitoring only)

## Auto-Start on Boot

To start monitor automatically when VPS boots:

1. Create scheduled task in Task Scheduler
2. Trigger: At startup
3. Action: `C:\MT5-Terminals\Monitor\MT5ResourceMonitor.exe`
4. Delay: 60 seconds (after terminals start)

See [VPS-DEPLOYMENT-GUIDE.md](../../docs/VPS-DEPLOYMENT-GUIDE.md) for detailed instructions.

## License

Proprietary - Scalperium MT5 SaaS Platform

## Support

For issues or questions:
- Check troubleshooting section above
- Review deployment guide: `/docs/VPS-DEPLOYMENT-GUIDE.md`
- Contact: support@scalperium.com

---

**Version:** 1.0.0
**Last Updated:** 2026-01-16
**Author:** Scalperium Team
