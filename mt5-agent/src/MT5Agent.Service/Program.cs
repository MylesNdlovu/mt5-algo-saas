using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MT5Agent.Core.Interfaces;
using MT5Agent.Core.Models;
using MT5Agent.Core.Services;
using MT5Agent.Service;
using MT5Agent.WebSocket;
using Serilog;

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .WriteTo.Console()
    .WriteTo.File(
        path: @"C:\MT5Agent\Logs\agent-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30)
    .CreateLogger();

try
{
    Log.Information("Starting MT5 Agent Service");

    var builder = Host.CreateApplicationBuilder(args);

    // Configure as Windows Service
    builder.Services.AddWindowsService(options =>
    {
        options.ServiceName = "MT5AgentService";
    });

    // Add Serilog
    builder.Services.AddSerilog();

    // Load configuration
    var agentConfig = builder.Configuration
        .GetSection("Agent")
        .Get<AgentConfiguration>() ?? new AgentConfiguration();

    // Generate machine ID if not set
    if (string.IsNullOrEmpty(agentConfig.MachineId))
    {
        agentConfig.MachineId = MachineIdGenerator.Generate();
        Log.Information("Generated Machine ID: {MachineId}", agentConfig.MachineId);
    }

    // Register services
    builder.Services.AddSingleton(agentConfig);
    builder.Services.AddSingleton<WebSocketClient>();
    builder.Services.AddSingleton<IEABridgeClient, FileBridgeClient>();
    builder.Services.AddSingleton<IMT5InstanceManager, MT5InstanceManager>();
    builder.Services.AddHostedService<AgentWorker>();

    var host = builder.Build();
    await host.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    await Log.CloseAndFlushAsync();
}
