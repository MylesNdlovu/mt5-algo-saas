; MT5 Agent Windows Installer
; Inno Setup Script
; Compile with Inno Setup 6.x

#define MyAppName "Scalperium MT5 Agent"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Scalperium"
#define MyAppURL "https://scalperium.com"
#define MyAppExeName "MT5AgentService.exe"
#define MT5DownloadURL "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"

[Setup]
AppId={{A8E9F7B2-4D3C-4A1E-B8F5-6C2D9E1A3B4C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName=C:\MT5Agent
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=output
OutputBaseFilename=MT5AgentSetup-{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableDirPage=no
DisableProgramGroupPage=yes
; Icon files (optional - remove these lines if you don't have the icon)
#ifexist "assets\scalperium.ico"
SetupIconFile=assets\scalperium.ico
UninstallDisplayIcon={app}\scalperium.ico
#endif

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Types]
Name: "full"; Description: "Full installation (Master + Slave support)"
Name: "master"; Description: "Master terminal only (Demo account with EA)"
Name: "slave"; Description: "Slave terminals only (User accounts with Trade Copier)"
Name: "custom"; Description: "Custom installation"; Flags: iscustom

[Components]
Name: "core"; Description: "MT5 Agent Service (Required)"; Types: full master slave custom; Flags: fixed
Name: "mql5"; Description: "MQL5 Files (Indicator, EA, Libraries)"; Types: full master slave custom; Flags: fixed
Name: "indicator"; Description: "Scalperium Traffic Light Indicator"; Types: full master slave custom
Name: "tradingea"; Description: "Scalperium Trading Bot"; Types: full master
Name: "copier"; Description: "Local Trade Copier EA"; Types: full slave
Name: "presets"; Description: "EA Preset Files"; Types: full master

[Files]
; Core Service Files
Source: "bin\Release\net8.0-windows\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs; Components: core
#ifexist "assets\scalperium.ico"
Source: "assets\scalperium.ico"; DestDir: "{app}"; Flags: ignoreversion
#endif

; MQL5 Indicator
Source: "..\mql5\Indicators\*"; DestDir: "{app}\MQL5\Indicators"; Flags: ignoreversion; Components: indicator

; MQL5 Include Files
Source: "..\mql5\Include\*"; DestDir: "{app}\MQL5\Include"; Flags: ignoreversion; Components: mql5

; Trading EA
Source: "..\mql5\Experts\Galaxy_Gold_Scalper.ex5"; DestDir: "{app}\MQL5\Experts"; Flags: ignoreversion; Components: tradingea

; Trade Copier (user must provide their own licensed copy)
; Source: "..\mql5\Experts\Local Trade Copier EA MT5.ex5"; DestDir: "{app}\MQL5\Experts"; Flags: ignoreversion; Components: copier

; Libraries
Source: "..\mql5\Libraries\*"; DestDir: "{app}\MQL5\Libraries"; Flags: ignoreversion; Components: mql5

; Presets
Source: "..\mql5\Presets\*"; DestDir: "{app}\MQL5\Presets"; Flags: ignoreversion; Components: presets

[Dirs]
Name: "{app}\Terminals"
Name: "{app}\Logs"
Name: "{app}\MQL5\Experts"
Name: "{app}\MQL5\Indicators"
Name: "{app}\MQL5\Include"
Name: "{app}\MQL5\Libraries"
Name: "{app}\MQL5\Presets"

[Icons]
Name: "{group}\{#MyAppName} Logs"; Filename: "{app}\Logs"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"

[Run]
; Install as Windows Service
Filename: "sc.exe"; Parameters: "create MT5AgentService binPath= ""{app}\{#MyAppExeName}"" start= auto DisplayName= ""Scalperium MT5 Agent Service"""; Flags: runhidden waituntilterminated; StatusMsg: "Installing Windows Service..."
Filename: "sc.exe"; Parameters: "description MT5AgentService ""Manages MT5 terminals and communicates with Scalperium web app"""; Flags: runhidden waituntilterminated
Filename: "sc.exe"; Parameters: "failure MT5AgentService reset= 86400 actions= restart/60000/restart/60000/restart/60000"; Flags: runhidden waituntilterminated; StatusMsg: "Configuring service recovery..."
; Start the service after installation
Filename: "sc.exe"; Parameters: "start MT5AgentService"; Flags: runhidden waituntilterminated postinstall; StatusMsg: "Starting MT5 Agent Service..."; Description: "Start Scalperium MT5 Agent Service"
; Open logs folder after installation
Filename: "{app}\Logs"; Flags: postinstall shellexec skipifsilent unchecked; Description: "Open Logs folder"

[UninstallRun]
; Stop and remove Windows Service
Filename: "sc.exe"; Parameters: "stop MT5AgentService"; Flags: runhidden waituntilterminated
Filename: "sc.exe"; Parameters: "delete MT5AgentService"; Flags: runhidden waituntilterminated

[Code]
var
  ConfigPage: TInputQueryWizardPage;
  MasterPage: TInputQueryWizardPage;
  MT5PathPage: TInputDirWizardPage;
  MT5FoundPath: String;

function FindMT5Installation: String;
begin
  Result := '';

  // Check common MT5 installation paths
  if FileExists('C:\Program Files\MetaTrader 5\terminal64.exe') then
    Result := 'C:\Program Files\MetaTrader 5'
  else if FileExists('C:\Program Files (x86)\MetaTrader 5\terminal64.exe') then
    Result := 'C:\Program Files (x86)\MetaTrader 5'
  else if FileExists('C:\MetaTrader 5\terminal64.exe') then
    Result := 'C:\MetaTrader 5'
  else if FileExists(ExpandConstant('{localappdata}\Programs\MetaTrader 5\terminal64.exe')) then
    Result := ExpandConstant('{localappdata}\Programs\MetaTrader 5');
end;

procedure InitializeWizard;
begin
  // Check for existing MT5 installation
  MT5FoundPath := FindMT5Installation;

  // Configuration Page
  ConfigPage := CreateInputQueryPage(wpSelectComponents,
    'Web App Connection',
    'Configure connection to Scalperium web app',
    'Enter your API key and WebSocket URL. You can find these in your admin panel.');
  ConfigPage.Add('API Key:', False);
  ConfigPage.Add('WebSocket URL:', False);
  ConfigPage.Add('VPS Name (e.g., VPS-FOREX-01):', False);
  ConfigPage.Add('VPS Region (e.g., London):', False);

  // Set defaults
  ConfigPage.Values[0] := '';
  ConfigPage.Values[1] := 'wss://api.scalperium.com:3001/ws';
  ConfigPage.Values[2] := 'VPS-FOREX-01';
  ConfigPage.Values[3] := 'London';

  // Master Account Page
  MasterPage := CreateInputQueryPage(ConfigPage.ID,
    'Master Terminal Setup',
    'Configure the master terminal for trading',
    'The master terminal runs the trading EA. We recommend using a demo account for optimal market data.');
  MasterPage.Add('Master Account Number:', False);
  MasterPage.Add('Max User Capacity (default 20):', False);

  MasterPage.Values[0] := '';
  MasterPage.Values[1] := '20';

  // MT5 Path Page
  MT5PathPage := CreateInputDirPage(MasterPage.ID,
    'MetaTrader 5 Location',
    'Select MT5 Installation',
    'Select the folder where MetaTrader 5 is installed. If MT5 is not installed, please install it first from https://www.metatrader5.com/',
    False, '');
  MT5PathPage.Add('');

  // Set default path to found location or common default
  if MT5FoundPath <> '' then
    MT5PathPage.Values[0] := MT5FoundPath
  else
    MT5PathPage.Values[0] := 'C:\Program Files\MetaTrader 5';
end;

function GetApiKey(Param: String): String;
begin
  Result := ConfigPage.Values[0];
end;

function GetWebSocketUrl(Param: String): String;
begin
  Result := ConfigPage.Values[1];
end;

function GetVpsName(Param: String): String;
begin
  Result := ConfigPage.Values[2];
end;

function GetVpsRegion(Param: String): String;
begin
  Result := ConfigPage.Values[3];
end;

function GetMasterAccount(Param: String): String;
begin
  Result := MasterPage.Values[0];
end;

function GetMaxCapacity(Param: String): String;
begin
  Result := MasterPage.Values[1];
end;

function GetMT5Path(Param: String): String;
begin
  Result := MT5PathPage.Values[0];
end;

function EscapeBackslashes(const S: String): String;
var
  I: Integer;
begin
  Result := '';
  for I := 1 to Length(S) do
  begin
    if S[I] = '\' then
      Result := Result + '\\'
    else
      Result := Result + S[I];
  end;
end;

procedure CreateConfigFile;
var
  ConfigContent: String;
  ConfigFile: String;
begin
  ConfigFile := ExpandConstant('{app}\appsettings.json');

  ConfigContent := '{' + #13#10;
  ConfigContent := ConfigContent + '  "Agent": {' + #13#10;
  ConfigContent := ConfigContent + '    "ApiKey": "' + GetApiKey('') + '",' + #13#10;
  ConfigContent := ConfigContent + '    "WebSocketUrl": "' + GetWebSocketUrl('') + '",' + #13#10;
  ConfigContent := ConfigContent + '    "IsPoolAgent": true,' + #13#10;
  ConfigContent := ConfigContent + '    "VpsName": "' + GetVpsName('') + '",' + #13#10;
  ConfigContent := ConfigContent + '    "VpsRegion": "' + GetVpsRegion('') + '",' + #13#10;
  ConfigContent := ConfigContent + '    "MaxCapacity": ' + GetMaxCapacity('') + ',' + #13#10;
  ConfigContent := ConfigContent + '    "HeartbeatIntervalMs": 5000,' + #13#10;
  ConfigContent := ConfigContent + '    "ReconnectDelayMs": 5000,' + #13#10;
  ConfigContent := ConfigContent + '    "MT5TerminalPath": "' + EscapeBackslashes(GetMT5Path('')) + '\\terminal64.exe",' + #13#10;
  ConfigContent := ConfigContent + '    "MT5PortableBasePath": "' + EscapeBackslashes(ExpandConstant('{app}')) + '\\Terminals",' + #13#10;
  ConfigContent := ConfigContent + '    "MQL5FilesPath": "' + EscapeBackslashes(ExpandConstant('{app}')) + '\\MQL5",' + #13#10;
  ConfigContent := ConfigContent + '    "AutoControlEA": true,' + #13#10;
  ConfigContent := ConfigContent + '    "CloseTradesOnRedSignal": true,' + #13#10;
  ConfigContent := ConfigContent + '    "EADisplayName": "Scalperium Trading Bot",' + #13#10;
  ConfigContent := ConfigContent + '    "UseTradeCopier": true,' + #13#10;
  ConfigContent := ConfigContent + '    "MasterAccountNumber": "' + GetMasterAccount('') + '",' + #13#10;
  ConfigContent := ConfigContent + '    "MasterIsDemoAccount": true,' + #13#10;
  ConfigContent := ConfigContent + '    "TradeCopierEAPath": "' + EscapeBackslashes(ExpandConstant('{app}')) + '\\MQL5\\Experts\\Local Trade Copier EA MT5.ex5"' + #13#10;
  ConfigContent := ConfigContent + '  },' + #13#10;
  ConfigContent := ConfigContent + '  "Serilog": {' + #13#10;
  ConfigContent := ConfigContent + '    "MinimumLevel": "Information",' + #13#10;
  ConfigContent := ConfigContent + '    "WriteTo": [' + #13#10;
  ConfigContent := ConfigContent + '      { "Name": "Console" },' + #13#10;
  ConfigContent := ConfigContent + '      {' + #13#10;
  ConfigContent := ConfigContent + '        "Name": "File",' + #13#10;
  ConfigContent := ConfigContent + '        "Args": {' + #13#10;
  ConfigContent := ConfigContent + '          "path": "' + EscapeBackslashes(ExpandConstant('{app}')) + '\\Logs\\agent-.log",' + #13#10;
  ConfigContent := ConfigContent + '          "rollingInterval": "Day",' + #13#10;
  ConfigContent := ConfigContent + '          "retainedFileCountLimit": 30' + #13#10;
  ConfigContent := ConfigContent + '        }' + #13#10;
  ConfigContent := ConfigContent + '      }' + #13#10;
  ConfigContent := ConfigContent + '    ]' + #13#10;
  ConfigContent := ConfigContent + '  }' + #13#10;
  ConfigContent := ConfigContent + '}' + #13#10;

  SaveStringToFile(ConfigFile, ConfigContent, False);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    CreateConfigFile;
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;

  // Validate API Key
  if CurPageID = ConfigPage.ID then
  begin
    if ConfigPage.Values[0] = '' then
    begin
      MsgBox('Please enter your API Key. You can find this in the Scalperium admin panel.', mbError, MB_OK);
      Result := False;
    end;
  end;

  // Validate MT5 Path
  if CurPageID = MT5PathPage.ID then
  begin
    if not FileExists(MT5PathPage.Values[0] + '\terminal64.exe') then
    begin
      MsgBox('MetaTrader 5 terminal64.exe not found in the selected folder.' + #13#10 + #13#10 +
             'Please install MetaTrader 5 first from:' + #13#10 +
             'https://www.metatrader5.com/en/download' + #13#10 + #13#10 +
             'Then run this installer again.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ExecResultCode: Integer;
begin
  Result := '';
  NeedsRestart := False;
  // Stop existing service if running
  Exec('sc.exe', 'stop MT5AgentService', '', SW_HIDE, ewWaitUntilTerminated, ExecResultCode);
  Sleep(2000); // Wait for service to stop
end;
