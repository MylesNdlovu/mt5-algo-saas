; Scalperium All-in-One Installer
; Includes: C# Agent Service + Node.js Web Server + MQL5 Files
; Single installer for complete VPS setup

#define MyAppName "Scalperium Trading Platform"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Scalperium"
#define MyAppURL "https://scalperium.com"

[Setup]
AppId={{B9F0E8C3-5D4E-4B2F-C9G6-7D3E0F2B4C5D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName=C:\Scalperium
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=output
OutputBaseFilename=ScalperiumSetup-{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableDirPage=no
DisableProgramGroupPage=yes
#ifexist "assets\scalperium.ico"
SetupIconFile=assets\scalperium.ico
UninstallDisplayIcon={app}\scalperium.ico
#endif

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Types]
Name: "full"; Description: "Full installation (Agent + Web Server + MQL5)"
Name: "agent"; Description: "Agent only (connect to external web server)"
Name: "custom"; Description: "Custom installation"; Flags: iscustom

[Components]
Name: "agent"; Description: "MT5 Agent Service (Required)"; Types: full agent custom; Flags: fixed
Name: "webserver"; Description: "Node.js Web Server (WebSocket + API)"; Types: full custom
Name: "mql5"; Description: "MQL5 Files (Indicator, EA, Libraries)"; Types: full agent custom

[Files]
; C# Agent Service
Source: "bin\Release\net8.0-windows\publish\*"; DestDir: "{app}\Agent"; Flags: ignoreversion recursesubdirs; Components: agent

; Node.js Portable Runtime
Source: "bundle\nodejs\*"; DestDir: "{app}\NodeJS"; Flags: ignoreversion recursesubdirs; Components: webserver

; WebSocket Server (lightweight)
Source: "bundle\wsserver\*"; DestDir: "{app}\WSServer"; Flags: ignoreversion recursesubdirs; Components: webserver

; MQL5 Files
Source: "bundle\mql5\Indicators\*"; DestDir: "{app}\MQL5\Indicators"; Flags: ignoreversion; Components: mql5
Source: "bundle\mql5\Include\*"; DestDir: "{app}\MQL5\Include"; Flags: ignoreversion; Components: mql5
Source: "bundle\mql5\Libraries\*"; DestDir: "{app}\MQL5\Libraries"; Flags: ignoreversion; Components: mql5
Source: "bundle\mql5\Experts\*"; DestDir: "{app}\MQL5\Experts"; Flags: ignoreversion skipifsourcedoesntexist; Components: mql5
Source: "bundle\mql5\Presets\*"; DestDir: "{app}\MQL5\Presets"; Flags: ignoreversion skipifsourcedoesntexist; Components: mql5

; Icon
#ifexist "assets\scalperium.ico"
Source: "assets\scalperium.ico"; DestDir: "{app}"; Flags: ignoreversion
#endif

[Dirs]
Name: "{app}\Agent\Logs"
Name: "{app}\Agent\Terminals"
Name: "{app}\WSServer\Logs"
Name: "{app}\MQL5\Experts"
Name: "{app}\MQL5\Indicators"
Name: "{app}\MQL5\Include"
Name: "{app}\MQL5\Libraries"
Name: "{app}\MQL5\Presets"

[Icons]
Name: "{group}\Scalperium Logs"; Filename: "{app}\Agent\Logs"
Name: "{group}\Scalperium Web Logs"; Filename: "{app}\WSServer\Logs"
Name: "{group}\Uninstall Scalperium"; Filename: "{uninstallexe}"

[Run]
; Install MT5 Agent Service
Filename: "sc.exe"; Parameters: "create ScalperiumAgent binPath= ""{app}\Agent\MT5AgentService.exe"" start= auto DisplayName= ""Scalperium MT5 Agent"""; Flags: runhidden waituntilterminated; Components: agent; StatusMsg: "Installing MT5 Agent Service..."
Filename: "sc.exe"; Parameters: "description ScalperiumAgent ""Manages MT5 terminals and communicates with Scalperium web app"""; Flags: runhidden waituntilterminated; Components: agent
Filename: "sc.exe"; Parameters: "failure ScalperiumAgent reset= 86400 actions= restart/60000/restart/60000/restart/60000"; Flags: runhidden waituntilterminated; Components: agent

; Start services
Filename: "sc.exe"; Parameters: "start ScalperiumAgent"; Flags: runhidden waituntilterminated postinstall; Components: agent; StatusMsg: "Starting MT5 Agent..."; Description: "Start Scalperium MT5 Agent"

; Start WebSocket Server (using Task Scheduler for auto-start)
Filename: "schtasks.exe"; Parameters: "/create /tn ""ScalperiumWebSocket"" /tr ""\"""{app}\NodeJS\node.exe\"" \""{app}\WSServer\server.js\"""" /sc onstart /ru SYSTEM /rl HIGHEST /f"; Flags: runhidden waituntilterminated; Components: webserver; StatusMsg: "Creating WebSocket startup task..."
Filename: "{app}\NodeJS\node.exe"; Parameters: """{app}\WSServer\server.js"""; Flags: runhidden nowait postinstall; Components: webserver; StatusMsg: "Starting WebSocket Server..."; Description: "Start WebSocket Server"

; Open logs
Filename: "{app}\Agent\Logs"; Flags: postinstall shellexec skipifsilent unchecked; Description: "Open Agent Logs folder"

[UninstallRun]
; Stop and remove C# Agent service
Filename: "sc.exe"; Parameters: "stop ScalperiumAgent"; Flags: runhidden waituntilterminated
Filename: "sc.exe"; Parameters: "delete ScalperiumAgent"; Flags: runhidden waituntilterminated
; Remove WebSocket scheduled task
Filename: "schtasks.exe"; Parameters: "/delete /tn ""ScalperiumWebSocket"" /f"; Flags: runhidden waituntilterminated
; Kill any running node.exe for WebSocket server
Filename: "taskkill.exe"; Parameters: "/f /im node.exe"; Flags: runhidden waituntilterminated

[Code]
var
  ConfigPage: TInputQueryWizardPage;
  DatabasePage: TInputQueryWizardPage;
  MT5PathPage: TInputDirWizardPage;
  MT5FoundPath: String;

function FindMT5Installation: String;
begin
  Result := '';
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
  MT5FoundPath := FindMT5Installation;

  // Agent Configuration Page
  ConfigPage := CreateInputQueryPage(wpSelectComponents,
    'Agent Configuration',
    'Configure the MT5 Agent',
    'Enter the agent settings. These will be saved to the configuration file.');
  ConfigPage.Add('VPS Name (e.g., VPS-FOREX-01):', False);
  ConfigPage.Add('VPS Region (e.g., London):', False);
  ConfigPage.Add('Max User Capacity:', False);
  ConfigPage.Add('Master Account Number (demo):', False);

  ConfigPage.Values[0] := 'VPS-FOREX-01';
  ConfigPage.Values[1] := 'London';
  ConfigPage.Values[2] := '20';
  ConfigPage.Values[3] := '';

  // Database Configuration Page
  DatabasePage := CreateInputQueryPage(ConfigPage.ID,
    'Database Configuration',
    'Configure database connection',
    'Enter your Neon database URL (same as Vercel) and Agent API Key.');
  DatabasePage.Add('Database URL (Neon):', False);
  DatabasePage.Add('Agent API Key:', False);

  DatabasePage.Values[0] := 'postgresql://user:pass@ep-xxx.neon.tech/scalperium?sslmode=require';
  DatabasePage.Values[1] := '';

  // MT5 Path Page
  MT5PathPage := CreateInputDirPage(DatabasePage.ID,
    'MetaTrader 5 Location',
    'Select MT5 Installation',
    'Select the folder where MetaTrader 5 is installed.',
    False, '');
  MT5PathPage.Add('');

  if MT5FoundPath <> '' then
    MT5PathPage.Values[0] := MT5FoundPath
  else
    MT5PathPage.Values[0] := 'C:\Program Files\MetaTrader 5';
end;

function GetVpsName(Param: String): String; begin Result := ConfigPage.Values[0]; end;
function GetVpsRegion(Param: String): String; begin Result := ConfigPage.Values[1]; end;
function GetMaxCapacity(Param: String): String; begin Result := ConfigPage.Values[2]; end;
function GetMasterAccount(Param: String): String; begin Result := ConfigPage.Values[3]; end;
function GetDatabaseUrl(Param: String): String; begin Result := DatabasePage.Values[0]; end;
function GetApiKey(Param: String): String; begin Result := DatabasePage.Values[1]; end;
function GetMT5Path(Param: String): String; begin Result := MT5PathPage.Values[0]; end;

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

procedure CreateAgentConfig;
var
  ConfigContent: String;
  ConfigFile: String;
begin
  ConfigFile := ExpandConstant('{app}\Agent\appsettings.json');

  ConfigContent := '{' + #13#10;
  ConfigContent := ConfigContent + '  "Agent": {' + #13#10;
  ConfigContent := ConfigContent + '    "ApiKey": "' + GetApiKey('') + '",' + #13#10;
  ConfigContent := ConfigContent + '    "WebSocketUrl": "ws://127.0.0.1:3001/ws",' + #13#10;
  ConfigContent := ConfigContent + '    "IsPoolAgent": true,' + #13#10;
  ConfigContent := ConfigContent + '    "VpsName": "' + GetVpsName('') + '",' + #13#10;
  ConfigContent := ConfigContent + '    "VpsRegion": "' + GetVpsRegion('') + '",' + #13#10;
  ConfigContent := ConfigContent + '    "MaxCapacity": ' + GetMaxCapacity('') + ',' + #13#10;
  ConfigContent := ConfigContent + '    "HeartbeatIntervalMs": 5000,' + #13#10;
  ConfigContent := ConfigContent + '    "ReconnectDelayMs": 5000,' + #13#10;
  ConfigContent := ConfigContent + '    "MT5TerminalPath": "' + EscapeBackslashes(GetMT5Path('')) + '\\terminal64.exe",' + #13#10;
  ConfigContent := ConfigContent + '    "MT5PortableBasePath": "' + EscapeBackslashes(ExpandConstant('{app}')) + '\\Agent\\Terminals",' + #13#10;
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
  ConfigContent := ConfigContent + '          "path": "' + EscapeBackslashes(ExpandConstant('{app}')) + '\\Agent\\Logs\\agent-.log",' + #13#10;
  ConfigContent := ConfigContent + '          "rollingInterval": "Day",' + #13#10;
  ConfigContent := ConfigContent + '          "retainedFileCountLimit": 30' + #13#10;
  ConfigContent := ConfigContent + '        }' + #13#10;
  ConfigContent := ConfigContent + '      }' + #13#10;
  ConfigContent := ConfigContent + '    ]' + #13#10;
  ConfigContent := ConfigContent + '  }' + #13#10;
  ConfigContent := ConfigContent + '}' + #13#10;

  SaveStringToFile(ConfigFile, ConfigContent, False);
end;

procedure CreateWSServerEnv;
var
  EnvContent: String;
  EnvFile: String;
begin
  EnvFile := ExpandConstant('{app}\WSServer\.env');

  EnvContent := '# Scalperium WebSocket Server Configuration' + #13#10;
  EnvContent := EnvContent + '# Generated by installer on ' + GetDateTimeString('yyyy-mm-dd hh:nn:ss', '-', ':') + #13#10;
  EnvContent := EnvContent + '# Note: Emails are handled by Vercel web app, not this server' + #13#10;
  EnvContent := EnvContent + #13#10;
  EnvContent := EnvContent + 'DATABASE_URL="' + GetDatabaseUrl('') + '"' + #13#10;
  EnvContent := EnvContent + 'NODE_ENV=production' + #13#10;
  EnvContent := EnvContent + 'WS_PORT=3001' + #13#10;
  EnvContent := EnvContent + 'HOST=0.0.0.0' + #13#10;

  SaveStringToFile(EnvFile, EnvContent, False);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    CreateAgentConfig;
    if WizardIsComponentSelected('webserver') then
      CreateWSServerEnv;
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;

  if CurPageID = DatabasePage.ID then
  begin
    if (GetApiKey('') = '') then
    begin
      MsgBox('Please enter an Agent API Key.', mbError, MB_OK);
      Result := False;
    end;
  end;

  if CurPageID = MT5PathPage.ID then
  begin
    if not FileExists(MT5PathPage.Values[0] + '\terminal64.exe') then
    begin
      if MsgBox('MetaTrader 5 not found at this location.' + #13#10 + #13#10 +
                'Continue anyway? (You can install MT5 later)', mbConfirmation, MB_YESNO) = IDNO then
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
  Exec('sc.exe', 'stop ScalperiumAgent', '', SW_HIDE, ewWaitUntilTerminated, ExecResultCode);
  Exec('sc.exe', 'stop ScalperiumWebServer', '', SW_HIDE, ewWaitUntilTerminated, ExecResultCode);
  Sleep(2000);
end;
