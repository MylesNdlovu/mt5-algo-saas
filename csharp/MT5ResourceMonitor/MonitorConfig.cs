using System;
using System.IO;
using Newtonsoft.Json;

namespace MT5ResourceMonitor
{
    public class MonitorConfig
    {
        public int TerminalCount { get; set; } = 6;
        public string InstallPath { get; set; } = @"C:\MT5-Terminals";
        public ResourceThresholds Thresholds { get; set; } = new ResourceThresholds();
        public int RefreshIntervalSeconds { get; set; } = 5;
        public bool AlertOnHighUsage { get; set; } = true;
        public string ServerName { get; set; } = "Prime VPS";

        private static readonly string ConfigPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "MT5ResourceMonitor",
            "config.json"
        );

        public static MonitorConfig Load()
        {
            try
            {
                // Check for config in install path first (deployed with terminals)
                string deployedConfigPath = @"C:\MT5-Terminals\ResourceMonitor.json";

                if (File.Exists(deployedConfigPath))
                {
                    string json = File.ReadAllText(deployedConfigPath);
                    var config = JsonConvert.DeserializeObject<MonitorConfig>(json);
                    if (config != null)
                        return config;
                }

                // Fall back to AppData config
                if (File.Exists(ConfigPath))
                {
                    string json = File.ReadAllText(ConfigPath);
                    var config = JsonConvert.DeserializeObject<MonitorConfig>(json);
                    if (config != null)
                        return config;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error loading config: {ex.Message}");
            }

            // Return default config
            var defaultConfig = new MonitorConfig();
            defaultConfig.Save(); // Save default config for next time
            return defaultConfig;
        }

        public void Save()
        {
            try
            {
                // Ensure directory exists
                string? directory = Path.GetDirectoryName(ConfigPath);
                if (directory != null && !Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                // Save to AppData
                string json = JsonConvert.SerializeObject(this, Formatting.Indented);
                File.WriteAllText(ConfigPath, json);

                // Also save to install path if it exists
                string deployedConfigPath = @"C:\MT5-Terminals\ResourceMonitor.json";
                string? deployedDir = Path.GetDirectoryName(deployedConfigPath);

                if (deployedDir != null && Directory.Exists(deployedDir))
                {
                    File.WriteAllText(deployedConfigPath, json);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error saving config: {ex.Message}");
            }
        }
    }

    public class ResourceThresholds
    {
        public double MaxRAMUsagePercent { get; set; } = 80;
        public double MaxCPUUsagePercent { get; set; } = 85;
        public double WarningRAMPercent { get; set; } = 70;
        public double WarningCPUPercent { get; set; } = 75;
    }
}
