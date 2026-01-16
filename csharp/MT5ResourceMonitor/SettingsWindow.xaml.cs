using System;
using System.Windows;
using Microsoft.Win32;

namespace MT5ResourceMonitor
{
    public partial class SettingsWindow : Window
    {
        private MonitorConfig _config;

        public SettingsWindow(MonitorConfig config)
        {
            InitializeComponent();
            _config = config;
            LoadSettings();
        }

        private void LoadSettings()
        {
            ServerNameBox.Text = _config.ServerName;
            TerminalCountBox.Text = _config.TerminalCount.ToString();
            InstallPathBox.Text = _config.InstallPath;
            RefreshIntervalBox.Text = _config.RefreshIntervalSeconds.ToString();

            RamWarningBox.Text = _config.Thresholds.WarningRAMPercent.ToString();
            RamMaxBox.Text = _config.Thresholds.MaxRAMUsagePercent.ToString();
            CpuWarningBox.Text = _config.Thresholds.WarningCPUPercent.ToString();
            CpuMaxBox.Text = _config.Thresholds.MaxCPUUsagePercent.ToString();

            AlertsCheckBox.IsChecked = _config.AlertOnHighUsage;
        }

        private void BrowseButton_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new OpenFolderDialog
            {
                Title = "Select MT5 Terminals Installation Folder",
                InitialDirectory = _config.InstallPath
            };

            if (dialog.ShowDialog() == true)
            {
                InstallPathBox.Text = dialog.FolderName;
            }
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Validate and save settings
                _config.ServerName = ServerNameBox.Text;

                if (!int.TryParse(TerminalCountBox.Text, out int terminalCount) || terminalCount < 1 || terminalCount > 50)
                {
                    MessageBox.Show("Terminal count must be between 1 and 50.", "Validation Error",
                        MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
                _config.TerminalCount = terminalCount;

                _config.InstallPath = InstallPathBox.Text;

                if (!int.TryParse(RefreshIntervalBox.Text, out int refreshInterval) || refreshInterval < 1 || refreshInterval > 60)
                {
                    MessageBox.Show("Refresh interval must be between 1 and 60 seconds.", "Validation Error",
                        MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
                _config.RefreshIntervalSeconds = refreshInterval;

                // Validate thresholds
                if (!double.TryParse(RamWarningBox.Text, out double ramWarning) || ramWarning < 0 || ramWarning > 100)
                {
                    MessageBox.Show("RAM warning threshold must be between 0 and 100%.", "Validation Error",
                        MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
                _config.Thresholds.WarningRAMPercent = ramWarning;

                if (!double.TryParse(RamMaxBox.Text, out double ramMax) || ramMax < 0 || ramMax > 100)
                {
                    MessageBox.Show("RAM maximum threshold must be between 0 and 100%.", "Validation Error",
                        MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
                _config.Thresholds.MaxRAMUsagePercent = ramMax;

                if (!double.TryParse(CpuWarningBox.Text, out double cpuWarning) || cpuWarning < 0 || cpuWarning > 100)
                {
                    MessageBox.Show("CPU warning threshold must be between 0 and 100%.", "Validation Error",
                        MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
                _config.Thresholds.WarningCPUPercent = cpuWarning;

                if (!double.TryParse(CpuMaxBox.Text, out double cpuMax) || cpuMax < 0 || cpuMax > 100)
                {
                    MessageBox.Show("CPU maximum threshold must be between 0 and 100%.", "Validation Error",
                        MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
                _config.Thresholds.MaxCPUUsagePercent = cpuMax;

                _config.AlertOnHighUsage = AlertsCheckBox.IsChecked ?? false;

                // Save config
                _config.Save();

                DialogResult = true;
                Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error saving settings: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
