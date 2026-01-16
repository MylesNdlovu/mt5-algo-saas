using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Management;
using System.Windows;
using System.Windows.Media;
using System.Windows.Threading;
using LiveCharts;
using LiveCharts.Wpf;
using LiveCharts.Defaults;

namespace MT5ResourceMonitor
{
    public partial class MainWindow : Window
    {
        private DispatcherTimer _refreshTimer;
        private ResourceMonitor _resourceMonitor;
        private MonitorConfig _config;
        private ObservableCollection<TerminalInfo> _terminals;

        // Chart data
        private ChartValues<ObservableValue> _ramChartValues;
        private ChartValues<ObservableValue> _cpuChartValues;
        private const int MaxChartPoints = 60; // 5 minutes at 5-second intervals

        public MainWindow()
        {
            InitializeComponent();
            InitializeMonitoring();
            InitializeCharts();
            StartMonitoring();
        }

        private void InitializeMonitoring()
        {
            // Load configuration
            _config = MonitorConfig.Load();

            // Initialize resource monitor
            _resourceMonitor = new ResourceMonitor();

            // Initialize terminals list
            _terminals = new ObservableCollection<TerminalInfo>();
            TerminalsList.ItemsSource = _terminals;

            // Set up refresh timer
            _refreshTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(_config.RefreshIntervalSeconds)
            };
            _refreshTimer.Tick += RefreshTimer_Tick;
        }

        private void InitializeCharts()
        {
            // Initialize RAM chart
            _ramChartValues = new ChartValues<ObservableValue>();
            RamChart.Series = new SeriesCollection
            {
                new LineSeries
                {
                    Title = "RAM Usage",
                    Values = _ramChartValues,
                    Stroke = new SolidColorBrush(Color.FromRgb(16, 185, 129)),
                    Fill = new SolidColorBrush(Color.FromArgb(50, 16, 185, 129)),
                    PointGeometry = null,
                    LineSmoothness = 0.3
                }
            };

            RamChart.AxisX.Add(new Axis
            {
                Foreground = new SolidColorBrush(Color.FromRgb(156, 163, 175)),
                ShowLabels = false
            });

            RamChart.AxisY.Add(new Axis
            {
                Title = "GB",
                Foreground = new SolidColorBrush(Color.FromRgb(156, 163, 175)),
                LabelFormatter = value => $"{value:F1}"
            });

            // Initialize CPU chart
            _cpuChartValues = new ChartValues<ObservableValue>();
            CpuChart.Series = new SeriesCollection
            {
                new LineSeries
                {
                    Title = "CPU Usage",
                    Values = _cpuChartValues,
                    Stroke = new SolidColorBrush(Color.FromRgb(59, 130, 246)),
                    Fill = new SolidColorBrush(Color.FromArgb(50, 59, 130, 246)),
                    PointGeometry = null,
                    LineSmoothness = 0.3
                }
            };

            CpuChart.AxisX.Add(new Axis
            {
                Foreground = new SolidColorBrush(Color.FromRgb(156, 163, 175)),
                ShowLabels = false
            });

            CpuChart.AxisY.Add(new Axis
            {
                Title = "%",
                Foreground = new SolidColorBrush(Color.FromRgb(156, 163, 175)),
                LabelFormatter = value => $"{value:F0}%",
                MinValue = 0,
                MaxValue = 100
            });
        }

        private void StartMonitoring()
        {
            _refreshTimer.Start();
            UpdateResourceInfo(); // Initial update
        }

        private void RefreshTimer_Tick(object? sender, EventArgs e)
        {
            UpdateResourceInfo();
        }

        private void UpdateResourceInfo()
        {
            try
            {
                var resources = _resourceMonitor.GetSystemResources();
                var terminals = _resourceMonitor.GetMT5Terminals();

                // Update RAM info
                double ramUsedGB = resources.UsedRAM;
                double ramTotalGB = resources.TotalRAM;
                double ramPercent = (ramUsedGB / ramTotalGB) * 100;

                RamUsageText.Text = $"{ramUsedGB:F1} / {ramTotalGB:F1} GB";
                RamPercentText.Text = $"{ramPercent:F1}%";
                RamProgressBar.Value = ramPercent;

                // Color code RAM progress bar
                if (ramPercent > _config.Thresholds.MaxRAMUsagePercent)
                    RamProgressBar.Foreground = new SolidColorBrush(Color.FromRgb(239, 68, 68)); // Red
                else if (ramPercent > _config.Thresholds.WarningRAMPercent)
                    RamProgressBar.Foreground = new SolidColorBrush(Color.FromRgb(245, 158, 11)); // Yellow
                else
                    RamProgressBar.Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129)); // Green

                // Update CPU info
                double cpuPercent = resources.CPUUsage;
                CpuUsageText.Text = $"{cpuPercent:F1}%";
                CpuProgressBar.Value = cpuPercent;
                CpuCoresText.Text = $"{resources.CPUCores} cores";

                // Color code CPU progress bar
                if (cpuPercent > _config.Thresholds.MaxCPUUsagePercent)
                    CpuProgressBar.Foreground = new SolidColorBrush(Color.FromRgb(239, 68, 68));
                else if (cpuPercent > _config.Thresholds.WarningCPUPercent)
                    CpuProgressBar.Foreground = new SolidColorBrush(Color.FromRgb(245, 158, 11));
                else
                    CpuProgressBar.Foreground = new SolidColorBrush(Color.FromRgb(59, 130, 246));

                // Update terminals info
                int terminalCount = terminals.Count;
                int maxSafeTerminals = _resourceMonitor.CalculateMaxSafeTerminals(ramTotalGB);

                TerminalCountText.Text = $"{terminalCount} / {maxSafeTerminals}";
                TerminalProgressBar.Value = (double)terminalCount / maxSafeTerminals * 100;

                // Determine if safe to add more
                bool canAddMore = terminalCount < maxSafeTerminals &&
                                  ramPercent < _config.Thresholds.WarningRAMPercent &&
                                  cpuPercent < _config.Thresholds.WarningCPUPercent;

                if (canAddMore)
                {
                    int canAdd = maxSafeTerminals - terminalCount;
                    TerminalStatusText.Text = $"Safe to add {canAdd} more";
                    TerminalStatusText.Foreground = new SolidColorBrush(Color.FromRgb(196, 181, 253));
                    AddTerminalButton.IsEnabled = true;
                }
                else if (terminalCount >= maxSafeTerminals)
                {
                    TerminalStatusText.Text = "At maximum capacity";
                    TerminalStatusText.Foreground = new SolidColorBrush(Color.FromRgb(239, 68, 68));
                    AddTerminalButton.IsEnabled = false;
                }
                else
                {
                    TerminalStatusText.Text = "High resource usage";
                    TerminalStatusText.Foreground = new SolidColorBrush(Color.FromRgb(245, 158, 11));
                    AddTerminalButton.IsEnabled = false;
                }

                // Update system status
                UpdateSystemStatus(ramPercent, cpuPercent, terminalCount, maxSafeTerminals);

                // Update terminals list
                UpdateTerminalsList(terminals);

                // Update charts
                UpdateCharts(ramUsedGB, cpuPercent);

                // Update status bar
                StatusBarText.Text = $"Connected | Last update: {DateTime.Now:HH:mm:ss} | {terminalCount} terminals running";
                ConnectionStatusIndicator.Fill = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            }
            catch (Exception ex)
            {
                StatusBarText.Text = $"Error: {ex.Message}";
                ConnectionStatusIndicator.Fill = new SolidColorBrush(Color.FromRgb(239, 68, 68));
            }
        }

        private void UpdateSystemStatus(double ramPercent, double cpuPercent, int terminalCount, int maxTerminals)
        {
            bool isHealthy = ramPercent < _config.Thresholds.WarningRAMPercent &&
                            cpuPercent < _config.Thresholds.WarningCPUPercent &&
                            terminalCount < maxTerminals;

            bool isWarning = (ramPercent >= _config.Thresholds.WarningRAMPercent && ramPercent < _config.Thresholds.MaxRAMUsagePercent) ||
                            (cpuPercent >= _config.Thresholds.WarningCPUPercent && cpuPercent < _config.Thresholds.MaxCPUUsagePercent);

            bool isDanger = ramPercent >= _config.Thresholds.MaxRAMUsagePercent ||
                           cpuPercent >= _config.Thresholds.MaxCPUUsagePercent ||
                           terminalCount >= maxTerminals;

            if (isDanger)
            {
                SystemStatusText.Text = "DANGER";
                SystemStatusText.Foreground = new SolidColorBrush(Color.FromRgb(239, 68, 68));
                SystemStatusDetailText.Text = "Resources critically high! Consider stopping terminals.";
                SystemStatusCard.Background = new SolidColorBrush(Color.FromArgb(30, 239, 68, 68));
            }
            else if (isWarning)
            {
                SystemStatusText.Text = "WARNING";
                SystemStatusText.Foreground = new SolidColorBrush(Color.FromRgb(245, 158, 11));
                SystemStatusDetailText.Text = "Resources elevated. Monitor closely.";
                SystemStatusCard.Background = new SolidColorBrush(Color.FromArgb(30, 245, 158, 11));
            }
            else
            {
                SystemStatusText.Text = "HEALTHY";
                SystemStatusText.Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129));
                SystemStatusDetailText.Text = "All systems normal";
                SystemStatusCard.Background = new SolidColorBrush(Color.FromRgb(45, 45, 45));
            }
        }

        private void UpdateTerminalsList(List<MT5Terminal> terminals)
        {
            // Clear and repopulate
            _terminals.Clear();

            foreach (var terminal in terminals.OrderBy(t => t.ProcessId))
            {
                _terminals.Add(new TerminalInfo
                {
                    Name = $"Terminal (PID: {terminal.ProcessId})",
                    RamUsage = $"{terminal.MemoryMB:F0} MB",
                    CpuUsage = $"{terminal.CpuPercent:F1}%",
                    ProcessId = terminal.ProcessId
                });
            }
        }

        private void UpdateCharts(double ramUsedGB, double cpuPercent)
        {
            // Add new data points
            if (_ramChartValues.Count >= MaxChartPoints)
                _ramChartValues.RemoveAt(0);
            _ramChartValues.Add(new ObservableValue(ramUsedGB));

            if (_cpuChartValues.Count >= MaxChartPoints)
                _cpuChartValues.RemoveAt(0);
            _cpuChartValues.Add(new ObservableValue(cpuPercent));
        }

        private void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            UpdateResourceInfo();
        }

        private void SettingsButton_Click(object sender, RoutedEventArgs e)
        {
            var settingsWindow = new SettingsWindow(_config);
            if (settingsWindow.ShowDialog() == true)
            {
                // Reload config and update timer
                _config = MonitorConfig.Load();
                _refreshTimer.Interval = TimeSpan.FromSeconds(_config.RefreshIntervalSeconds);
            }
        }

        private void AddTerminalButton_Click(object sender, RoutedEventArgs e)
        {
            var resources = _resourceMonitor.GetSystemResources();
            int currentCount = _resourceMonitor.GetMT5Terminals().Count;
            int maxSafe = _resourceMonitor.CalculateMaxSafeTerminals(resources.TotalRAM);

            if (currentCount >= maxSafe)
            {
                MessageBox.Show(
                    $"Cannot add more terminals!\n\n" +
                    $"Current: {currentCount} terminals\n" +
                    $"Maximum safe: {maxSafe} terminals\n\n" +
                    $"Stop some terminals or upgrade your server.",
                    "Resource Limit Reached",
                    MessageBoxButton.OK,
                    MessageBoxImage.Warning
                );
                return;
            }

            var result = MessageBox.Show(
                $"Ready to launch a new MT5 terminal?\n\n" +
                $"Current terminals: {currentCount}\n" +
                $"After adding: {currentCount + 1}\n" +
                $"Maximum safe: {maxSafe}\n\n" +
                $"This will start a new portable MT5 instance.",
                "Add New Terminal",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question
            );

            if (result == MessageBoxResult.Yes)
            {
                try
                {
                    // Find next available terminal
                    int nextTerminal = currentCount + 1;
                    string terminalPath = $@"{_config.InstallPath}\MT5-Terminal-{nextTerminal}\terminal64.exe";

                    if (System.IO.File.Exists(terminalPath))
                    {
                        Process.Start(terminalPath);
                        System.Threading.Thread.Sleep(2000); // Wait for process to start
                        UpdateResourceInfo(); // Refresh display
                    }
                    else
                    {
                        MessageBox.Show(
                            $"Terminal not found at:\n{terminalPath}\n\n" +
                            $"Run the deployment script first to create portable terminals.",
                            "Terminal Not Found",
                            MessageBoxButton.OK,
                            MessageBoxImage.Error
                        );
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Failed to start terminal: {ex.Message}", "Error",
                        MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void StopAllButton_Click(object sender, RoutedEventArgs e)
        {
            var terminals = _resourceMonitor.GetMT5Terminals();

            if (terminals.Count == 0)
            {
                MessageBox.Show("No MT5 terminals are currently running.", "Info",
                    MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            var result = MessageBox.Show(
                $"Are you sure you want to stop all {terminals.Count} MT5 terminals?\n\n" +
                $"⚠️ This will close all open trades and connections!\n\n" +
                $"Make sure no active trades are running.",
                "Stop All Terminals",
                MessageBoxButton.YesNo,
                MessageBoxImage.Warning
            );

            if (result == MessageBoxResult.Yes)
            {
                try
                {
                    int stoppedCount = 0;
                    foreach (var terminal in terminals)
                    {
                        try
                        {
                            var process = Process.GetProcessById(terminal.ProcessId);
                            process.Kill();
                            stoppedCount++;
                        }
                        catch { }
                    }

                    System.Threading.Thread.Sleep(1000);
                    UpdateResourceInfo();

                    MessageBox.Show($"Successfully stopped {stoppedCount} terminal(s).", "Success",
                        MessageBoxButton.OK, MessageBoxImage.Information);
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Error stopping terminals: {ex.Message}", "Error",
                        MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
        {
            var result = MessageBox.Show(
                "Close Resource Monitor?\n\n" +
                "MT5 terminals will continue running in the background.\n" +
                "You can reopen this monitor anytime.",
                "Confirm Exit",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question
            );

            if (result == MessageBoxResult.No)
            {
                e.Cancel = true;
            }
            else
            {
                _refreshTimer?.Stop();
            }

            base.OnClosing(e);
        }
    }

    public class TerminalInfo
    {
        public string Name { get; set; } = "";
        public string RamUsage { get; set; } = "";
        public string CpuUsage { get; set; } = "";
        public int ProcessId { get; set; }
    }
}
