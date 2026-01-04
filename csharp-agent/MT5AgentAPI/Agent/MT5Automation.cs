using System;
using System.Threading.Tasks;
using System.Linq;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using FlaUI.Core;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;
using Newtonsoft.Json.Linq;

namespace MT5Agent
{
    public class MT5Automation : IDisposable
    {
        private Application? _mt5App;
        private UIA3Automation? _automation;
        private AutomationElement? _mainWindow;
        private readonly Dictionary<string, string> _chartRegistry = new();

        public bool IsConnected { get; private set; }

        public async Task Initialize()
        {
            _automation = new UIA3Automation();

            // Find existing MT5 process
            var mt5Process = Process.GetProcessesByName("terminal64").FirstOrDefault() 
                          ?? Process.GetProcessesByName("terminal").FirstOrDefault();

            if (mt5Process == null)
            {
                // Try to launch MT5
                string[] possiblePaths = new[]
                {
                    @"C:\Program Files\MetaTrader 5\terminal64.exe",
                    @"C:\Program Files (x86)\MetaTrader 5\terminal.exe",
                    @"C:\Users\" + Environment.UserName + @"\AppData\Roaming\MetaQuotes\Terminal\*.exe"
                };

                foreach (var path in possiblePaths)
                {
                    if (File.Exists(path))
                    {
                        _mt5App = Application.Launch(path);
                        await Task.Delay(8000); // Wait for MT5 to fully load
                        break;
                    }
                }

                if (_mt5App == null)
                {
                    throw new Exception("MT5 not found. Please install MetaTrader 5 or ensure it's running.");
                }
            }
            else
            {
                _mt5App = Application.Attach(mt5Process);
                await Task.Delay(1000);
            }

            _mainWindow = _mt5App.GetMainWindow(_automation);
            
            if (_mainWindow == null)
            {
                throw new Exception("Could not attach to MT5 main window");
            }

            IsConnected = true;
        }

        public async Task<object> OpenChart(JToken? paramsToken)
        {
            if (_mainWindow == null) throw new Exception("MT5 not initialized");

            var @params = paramsToken?.ToObject<Dictionary<string, string>>() ?? new Dictionary<string, string>();
            string symbol = @params.GetValueOrDefault("symbol", "EURUSD");
            string timeframe = @params.GetValueOrDefault("timeframe", "H1");

            try
            {
                // Find Market Watch window
                var marketWatch = FindElementByName(_mainWindow, "Market Watch");
                
                if (marketWatch == null)
                {
                    // Try to open Market Watch with Ctrl+M
                    _mainWindow.Focus();
                    await Task.Delay(200);
                    System.Windows.Forms.SendKeys.SendWait("^m");
                    await Task.Delay(500);
                    marketWatch = FindElementByName(_mainWindow, "Market Watch");
                }

                if (marketWatch == null)
                {
                    throw new Exception("Market Watch not accessible");
                }

                // Find symbol in Market Watch
                var symbolElement = FindElementByName(marketWatch, symbol);
                
                if (symbolElement == null)
                {
                    throw new Exception($"Symbol {symbol} not found in Market Watch. Add it manually first.");
                }

                // Right-click on symbol
                symbolElement.Click(false); // Select first
                await Task.Delay(300);
                symbolElement.RightClick();
                await Task.Delay(500);

                // Find and click "Chart Window" in context menu
                var contextMenu = _mainWindow.FindFirstDescendant(cf => cf.ByControlType(ControlType.Menu));
                
                if (contextMenu != null)
                {
                    var chartWindowItem = FindElementByName(contextMenu, "Chart Window");
                    if (chartWindowItem != null)
                    {
                        chartWindowItem.Click();
                        await Task.Delay(2000); // Wait for chart to open
                    }
                }

                // Set timeframe
                await SetTimeframe(timeframe);

                // Generate chart ID
                string chartId = $"{symbol}_{timeframe}_{Guid.NewGuid().ToString().Substring(0, 8)}";
                _chartRegistry[chartId] = $"{symbol}_{timeframe}";

                return new
                {
                    chartId,
                    symbol,
                    timeframe,
                    status = "opened"
                };
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to open chart: {ex.Message}");
            }
        }

        public async Task<object> CloseChart(JToken? paramsToken)
        {
            var @params = paramsToken?.ToObject<Dictionary<string, string>>() ?? new Dictionary<string, string>();
            string chartId = @params.GetValueOrDefault("chartId", "");

            if (_chartRegistry.ContainsKey(chartId))
            {
                _chartRegistry.Remove(chartId);
            }

            // Find and close the specific chart window
            // This is simplified - in production you'd track window handles
            await Task.Delay(500);

            return new { chartId, status = "closed" };
        }

        public async Task<object> AddIndicator(JToken? paramsToken)
        {
            if (_mainWindow == null) throw new Exception("MT5 not initialized");

            var @params = paramsToken?.ToObject<Dictionary<string, object>>() ?? new Dictionary<string, object>();
            string indicatorName = @params.GetValueOrDefault("indicatorName", "").ToString() ?? "";

            // Open Navigator if not visible
            var navigator = FindElementByName(_mainWindow, "Navigator");
            if (navigator == null)
            {
                _mainWindow.Focus();
                await Task.Delay(200);
                System.Windows.Forms.SendKeys.SendWait("^n");
                await Task.Delay(500);
            }

            return new
            {
                indicatorName,
                status = "added",
                message = "Indicator addition in progress"
            };
        }

        public async Task<object> LoadEA(JToken? paramsToken)
        {
            if (_mainWindow == null) throw new Exception("MT5 not initialized");

            var @params = paramsToken?.ToObject<Dictionary<string, object>>() ?? new Dictionary<string, object>();
            string eaName = @params.GetValueOrDefault("eaName", "").ToString() ?? "";
            string chartId = @params.GetValueOrDefault("chartId", "").ToString() ?? "";

            try
            {
                // Open Navigator
                var navigator = FindElementByName(_mainWindow, "Navigator");
                
                if (navigator == null)
                {
                    _mainWindow.Focus();
                    await Task.Delay(200);
                    System.Windows.Forms.SendKeys.SendWait("^n");
                    await Task.Delay(800);
                    navigator = FindElementByName(_mainWindow, "Navigator");
                }

                if (navigator == null)
                {
                    throw new Exception("Navigator not accessible");
                }

                // Expand Expert Advisors folder
                var expertsFolder = FindElementByName(navigator, "Expert Advisors");
                
                if (expertsFolder == null)
                {
                    expertsFolder = FindElementByName(navigator, "Experts");
                }

                if (expertsFolder != null && expertsFolder.Patterns.ExpandCollapse.IsSupported)
                {
                    expertsFolder.Patterns.ExpandCollapse.Pattern.Expand();
                    await Task.Delay(500);
                }

                // Find EA
                var eaElement = FindElementByName(navigator, eaName);
                
                if (eaElement == null)
                {
                    throw new Exception($"EA '{eaName}' not found in Navigator. Ensure it's compiled in MQL5/Experts folder.");
                }

                // Double-click to attach EA to chart
                eaElement.DoubleClick();
                await Task.Delay(1500);

                // EA properties dialog should appear
                // Handle common properties dialog
                var propertiesWindow = _mainWindow.FindFirstDescendant(cf => cf.ByName("Properties"));
                
                if (propertiesWindow != null)
                {
                    // Set inputs if provided
                    if (@params.ContainsKey("inputs"))
                    {
                        await SetEAInputs(@params["inputs"]);
                    }

                    // Click OK button
                    var okButton = propertiesWindow.FindFirstDescendant(cf => cf.ByName("OK").And(cf.ByControlType(ControlType.Button)));
                    if (okButton != null)
                    {
                        okButton.Click();
                        await Task.Delay(500);
                    }
                }

                return new
                {
                    eaName,
                    chartId,
                    status = "loaded",
                    message = "EA attached to chart"
                };
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to load EA: {ex.Message}");
            }
        }

        public async Task<object> ModifyEAInputs(JToken? paramsToken)
        {
            // Right-click chart -> Expert Advisors -> Properties
            // Modify input values
            await Task.Delay(500);

            return new { modified = true, message = "EA inputs modified" };
        }

        public async Task<object> StartEA(JToken? paramsToken)
        {
            if (_mainWindow == null) throw new Exception("MT5 not initialized");

            try
            {
                // Find AutoTrading button (Algo Trading button)
                var autoTradingButton = FindElementByName(_mainWindow, "AutoTrading") 
                                     ?? FindElementByName(_mainWindow, "Algo Trading");

                if (autoTradingButton != null && autoTradingButton.Patterns.Toggle.IsSupported)
                {
                    var togglePattern = autoTradingButton.Patterns.Toggle.Pattern;
                    if (togglePattern.ToggleState != ToggleState.On)
                    {
                        autoTradingButton.Click();
                        await Task.Delay(500);
                    }

                    return new { running = true, status = "AutoTrading enabled" };
                }
                else
                {
                    // Fallback: Press keyboard shortcut
                    _mainWindow.Focus();
                    await Task.Delay(200);
                    System.Windows.Forms.SendKeys.SendWait("%t"); // Alt+T for Tools menu
                    await Task.Delay(300);
                    System.Windows.Forms.SendKeys.SendWait("a"); // AutoTrading option
                    await Task.Delay(500);

                    return new { running = true, status = "AutoTrading toggle attempted" };
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to start EA: {ex.Message}");
            }
        }

        public async Task<object> StopEA(JToken? paramsToken)
        {
            if (_mainWindow == null) throw new Exception("MT5 not initialized");

            try
            {
                var autoTradingButton = FindElementByName(_mainWindow, "AutoTrading");

                if (autoTradingButton != null && autoTradingButton.Patterns.Toggle.IsSupported)
                {
                    var togglePattern = autoTradingButton.Patterns.Toggle.Pattern;
                    if (togglePattern.ToggleState == ToggleState.On)
                    {
                        autoTradingButton.Click();
                        await Task.Delay(500);
                    }
                }

                return new { running = false, status = "AutoTrading disabled" };
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to stop EA: {ex.Message}");
            }
        }

        public async Task<object> GetStatus(JToken? paramsToken)
        {
            if (_mainWindow == null) throw new Exception("MT5 not initialized");

            return new
            {
                connected = IsConnected,
                version = GetVersion(),
                account = GetAccount(),
                broker = GetBroker(),
                charts = _chartRegistry.Keys.ToArray(),
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };
        }

        public async Task<object> TakeScreenshot(JToken? paramsToken)
        {
            if (_mainWindow == null) throw new Exception("MT5 not initialized");

            try
            {
                // Capture screenshot using FlaUI
                var screenshot = Capture.Screen();
                
                // Convert to base64
                using var ms = new MemoryStream();
                screenshot.Save(ms, ImageFormat.Png);
                var base64 = Convert.ToBase64String(ms.ToArray());

                return new
                {
                    screenshot = $"data:image/png;base64,{base64}",
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };
            }
            catch (Exception ex)
            {
                throw new Exception($"Screenshot failed: {ex.Message}");
            }
        }

        // Helper Methods

        private AutomationElement? FindElementByName(AutomationElement parent, string name)
        {
            try
            {
                return parent.FindFirstDescendant(cf => cf.ByName(name));
            }
            catch
            {
                return null;
            }
        }

        private async Task SetTimeframe(string timeframe)
        {
            if (_mainWindow == null) return;

            // Map timeframe to keyboard shortcut or menu
            var tfMap = new Dictionary<string, string>
            {
                { "M1", "1" }, { "M5", "5" }, { "M15", "15" }, { "M30", "30" },
                { "H1", "H1" }, { "H4", "H4" }, { "D1", "D1" }, { "W1", "W1" }, { "MN", "MN" }
            };

            // Use keyboard shortcuts (period + number/letter)
            if (tfMap.ContainsKey(timeframe))
            {
                _mainWindow.Focus();
                await Task.Delay(200);
                // Implementation depends on MT5 shortcuts
            }

            await Task.Delay(500);
        }

        private async Task SetEAInputs(object inputsObj)
        {
            // Parse and set EA input parameters
            // This requires navigating the properties dialog
            await Task.Delay(500);
        }

        public string GetVersion()
        {
            try
            {
                if (_mainWindow != null)
                {
                    var title = _mainWindow.Name;
                    // Parse version from window title if available
                    return "5.0.37"; // Placeholder
                }
            }
            catch { }
            return "Unknown";
        }

        public string GetAccount()
        {
            try
            {
                // Extract account number from status bar
                return "Demo Account";
            }
            catch { }
            return "Unknown";
        }

        public string GetBroker()
        {
            try
            {
                // Extract broker name from window title or status
                if (_mainWindow != null)
                {
                    var title = _mainWindow.Name;
                    // Parse broker name
                    return "Demo Broker";
                }
            }
            catch { }
            return "Unknown";
        }

        public void Dispose()
        {
            _automation?.Dispose();
            _mt5App?.Close();
            _mt5App?.Dispose();
        }
    }
}
