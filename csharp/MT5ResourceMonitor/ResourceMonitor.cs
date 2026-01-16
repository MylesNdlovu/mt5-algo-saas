using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Management;

namespace MT5ResourceMonitor
{
    public class ResourceMonitor
    {
        private PerformanceCounter? _cpuCounter;
        private DateTime _lastCpuCheck = DateTime.MinValue;
        private double _lastCpuValue = 0;

        public ResourceMonitor()
        {
            try
            {
                _cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                _cpuCounter.NextValue(); // Prime the counter
            }
            catch
            {
                // Fall back to WMI if performance counters fail
                _cpuCounter = null;
            }
        }

        public SystemResources GetSystemResources()
        {
            var resources = new SystemResources();

            try
            {
                // Get RAM info using WMI
                using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_OperatingSystem"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        ulong totalMemory = Convert.ToUInt64(obj["TotalVisibleMemorySize"]);
                        ulong freeMemory = Convert.ToUInt64(obj["FreePhysicalMemory"]);

                        resources.TotalRAM = Math.Round(totalMemory / 1024.0 / 1024.0, 2); // Convert KB to GB
                        resources.FreeRAM = Math.Round(freeMemory / 1024.0 / 1024.0, 2);
                        resources.UsedRAM = Math.Round(resources.TotalRAM - resources.FreeRAM, 2);
                    }
                }

                // Get CPU info
                using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Processor"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        resources.CPUCores = Convert.ToInt32(obj["NumberOfCores"]);
                        resources.CPUThreads = Convert.ToInt32(obj["NumberOfLogicalProcessors"]);
                        resources.CPUName = obj["Name"]?.ToString() ?? "Unknown CPU";
                    }
                }

                // Get CPU usage
                resources.CPUUsage = GetCPUUsage();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error getting system resources: {ex.Message}");
            }

            return resources;
        }

        private double GetCPUUsage()
        {
            try
            {
                // Use cached value if checked recently (within 2 seconds)
                if ((DateTime.Now - _lastCpuCheck).TotalSeconds < 2)
                {
                    return _lastCpuValue;
                }

                if (_cpuCounter != null)
                {
                    // Performance counter method (faster, more accurate)
                    _lastCpuValue = Math.Round(_cpuCounter.NextValue(), 1);
                }
                else
                {
                    // WMI method (fallback)
                    using (var searcher = new ManagementObjectSearcher("SELECT LoadPercentage FROM Win32_Processor"))
                    {
                        double total = 0;
                        int count = 0;

                        foreach (ManagementObject obj in searcher.Get())
                        {
                            total += Convert.ToDouble(obj["LoadPercentage"]);
                            count++;
                        }

                        _lastCpuValue = count > 0 ? Math.Round(total / count, 1) : 0;
                    }
                }

                _lastCpuCheck = DateTime.Now;
                return _lastCpuValue;
            }
            catch
            {
                return 0;
            }
        }

        public List<MT5Terminal> GetMT5Terminals()
        {
            var terminals = new List<MT5Terminal>();

            try
            {
                // Find all terminal64.exe processes
                var processes = Process.GetProcessesByName("terminal64");

                foreach (var process in processes)
                {
                    try
                    {
                        var terminal = new MT5Terminal
                        {
                            ProcessId = process.Id,
                            ProcessName = process.ProcessName,
                            MemoryMB = Math.Round(process.WorkingSet64 / 1024.0 / 1024.0, 1),
                            StartTime = process.StartTime
                        };

                        // Get CPU usage for this specific process
                        terminal.CpuPercent = GetProcessCPUUsage(process);

                        terminals.Add(terminal);
                    }
                    catch
                    {
                        // Process may have exited, skip it
                        continue;
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error getting MT5 terminals: {ex.Message}");
            }

            return terminals;
        }

        private double GetProcessCPUUsage(Process process)
        {
            try
            {
                // Use WMI to get per-process CPU usage
                using (var searcher = new ManagementObjectSearcher(
                    $"SELECT PercentProcessorTime FROM Win32_PerfFormattedData_PerfProc_Process WHERE IDProcess = {process.Id}"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        return Math.Round(Convert.ToDouble(obj["PercentProcessorTime"]) / Environment.ProcessorCount, 1);
                    }
                }
            }
            catch
            {
                // Fallback: estimate based on total CPU and process count
                return 0;
            }

            return 0;
        }

        public int CalculateMaxSafeTerminals(double totalRAM)
        {
            // Formula: (Total RAM - Base Overhead) / RAM per terminal
            // Base overhead: 5.3 GB (Windows + C# agent + copier + buffer)
            // RAM per terminal: 1.2 GB

            const double baseOverhead = 5.3;
            const double ramPerTerminal = 1.2;

            double availableRAM = totalRAM - baseOverhead;

            if (availableRAM <= 0)
                return 0;

            int maxTerminals = (int)Math.Floor(availableRAM / ramPerTerminal);

            // Safety cap: never recommend more than 80% RAM usage
            double safeRAM = totalRAM * 0.8;
            int safeMaxTerminals = (int)Math.Floor((safeRAM - baseOverhead) / ramPerTerminal);

            return Math.Min(maxTerminals, safeMaxTerminals);
        }

        public bool CanAddTerminal(double totalRAM, double usedRAM, int currentTerminals)
        {
            int maxSafe = CalculateMaxSafeTerminals(totalRAM);

            if (currentTerminals >= maxSafe)
                return false;

            // Check if we have at least 1.5 GB free (buffer for new terminal)
            double freeRAM = totalRAM - usedRAM;
            return freeRAM >= 1.5;
        }
    }

    public class SystemResources
    {
        public double TotalRAM { get; set; }
        public double UsedRAM { get; set; }
        public double FreeRAM { get; set; }
        public double CPUUsage { get; set; }
        public int CPUCores { get; set; }
        public int CPUThreads { get; set; }
        public string CPUName { get; set; } = "Unknown";
    }

    public class MT5Terminal
    {
        public int ProcessId { get; set; }
        public string ProcessName { get; set; } = "";
        public double MemoryMB { get; set; }
        public double CpuPercent { get; set; }
        public DateTime StartTime { get; set; }
        public TimeSpan Uptime => DateTime.Now - StartTime;
    }
}
