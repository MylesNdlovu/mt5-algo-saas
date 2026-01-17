using System.Management;
using System.Net.NetworkInformation;
using System.Security.Cryptography;
using System.Text;

namespace MT5Agent.Service;

/// <summary>
/// Generates a unique, hardware-bound machine ID
/// </summary>
public static class MachineIdGenerator
{
    /// <summary>
    /// Generate a unique machine ID based on hardware components
    /// </summary>
    public static string Generate()
    {
        var components = new List<string>
        {
            GetProcessorId(),
            GetMotherboardSerial(),
            GetMacAddress(),
            GetDiskSerial()
        };

        var combined = string.Join("|", components.Where(c => !string.IsNullOrEmpty(c)));

        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(combined));

        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string GetProcessorId()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT ProcessorId FROM Win32_Processor");
            foreach (var obj in searcher.Get())
            {
                return obj["ProcessorId"]?.ToString() ?? string.Empty;
            }
        }
        catch
        {
            // Ignore errors
        }
        return string.Empty;
    }

    private static string GetMotherboardSerial()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BaseBoard");
            foreach (var obj in searcher.Get())
            {
                return obj["SerialNumber"]?.ToString() ?? string.Empty;
            }
        }
        catch
        {
            // Ignore errors
        }
        return string.Empty;
    }

    private static string GetMacAddress()
    {
        try
        {
            var nic = NetworkInterface
                .GetAllNetworkInterfaces()
                .FirstOrDefault(n =>
                    n.OperationalStatus == OperationalStatus.Up &&
                    n.NetworkInterfaceType != NetworkInterfaceType.Loopback);

            return nic?.GetPhysicalAddress().ToString() ?? string.Empty;
        }
        catch
        {
            // Ignore errors
        }
        return string.Empty;
    }

    private static string GetDiskSerial()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_DiskDrive WHERE Index=0");
            foreach (var obj in searcher.Get())
            {
                return obj["SerialNumber"]?.ToString()?.Trim() ?? string.Empty;
            }
        }
        catch
        {
            // Ignore errors
        }
        return string.Empty;
    }
}
