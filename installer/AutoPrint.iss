; ===============================================================================
;   AUTOPRINT / QRPRINT — PRODUCTION WINDOWS INSTALLER SCRIPT
;   Inno Setup 6 Script generating AutoPrint-Setup.exe
;   With Centralized Prerequisite Engine & Fresh-PC Zero-Dependency Support
; ===============================================================================

#define MyAppName "AutoPrint Express"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "AutoPrint Engineering"
#define MyAppURL "https://autoprint.pagekite.me"
#define MyAppExeName "AutoPrint.exe"

[Setup]
AppId={{D37E5528-947B-4E38-B578-838634B0B91C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\AutoPrint
DefaultGroupName=AutoPrint
AllowNoIcons=yes
OutputDir=..\dist-installer
OutputBaseFilename=AutoPrint-Setup
SetupIconFile=..\assets\icon\autoprint.ico
UninstallDisplayIcon={app}\assets\icon\autoprint.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
DisableDirPage=no
DisableProgramGroupPage=no
CloseApplications=yes
RestartApplications=no
SetupLogging=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Types]
Name: "full"; Description: "Full Print Station (Merchant PC + Local Kiosk + Spooler Engine)"
Name: "merchant"; Description: "Merchant PC (Operator Counter Desk, Pickup Verification & Spooler)"
Name: "kiosk"; Description: "Customer Standalone Kiosk (Touchscreen Upload Terminal)"
Name: "custom"; Description: "Custom Installation Options"; Flags: iscustom

[Components]
Name: "core"; Description: "AutoPrint Core Backend & SQLite Datastore"; Types: full merchant kiosk custom; Flags: fixed
Name: "merchant"; Description: "Merchant Desktop (Cash Desk, Rate Cards, Verification Desk)"; Types: full merchant custom
Name: "kiosk"; Description: "Customer Kiosk (Instant Document Upload & Preview)"; Types: full kiosk custom
Name: "spooler"; Description: "Universal Windows Spooler & Hardware Integration"; Types: full merchant custom

[Dirs]
Name: "{commonappdata}\{#MyAppName}"; Permissions: users-full
Name: "{commonappdata}\{#MyAppName}\config"; Permissions: users-full
Name: "{commonappdata}\{#MyAppName}\datastore"; Permissions: users-full
Name: "{commonappdata}\{#MyAppName}\logs"; Permissions: users-full

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startwithwindows"; Description: "Start AutoPrint automatically when Windows starts"; GroupDescription: "Windows Startup Options:"

[Files]
; Embedded Official Node.js Prerequisite MSI (extracted to temp only if Node.js is missing on target PC)
Source: "prerequisites\node-v20.18.0-x64.msi"; DestDir: "{tmp}"; Flags: deleteafterinstall dontcopy
; Embedded Official Microsoft .NET Framework 4.5.2 Prerequisite (extracted to temp only if .NET 4.x is missing on target PC)
Source: "prerequisites\NDP452-KB2901907-x86-x64-AllOS-ENU.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall dontcopy
; Centralized Prerequisite Definition Manifest
Source: "config\prerequisites.json"; DestDir: "{app}\installer\config"; Flags: ignoreversion
; Primary application payload compiled into dist-installer\payload
Source: "..\dist-installer\payload\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon\autoprint.ico"
Name: "{group}\AutoPrint Customer Tunnel (Manual)"; Filename: "{app}\Start-Customer-Tunnel.cmd"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon\autoprint.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon; IconFilename: "{app}\assets\icon\autoprint.ico"
Name: "{autodesktop}\AutoPrint Customer Tunnel (Manual)"; Filename: "{app}\Start-Customer-Tunnel.cmd"; WorkingDir: "{app}"; Tasks: desktopicon; IconFilename: "{app}\assets\icon\autoprint.ico"

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "AutoPrint"; ValueData: """{app}\{#MyAppExeName}"" --startup"; Flags: uninsdeletevalue; Tasks: startwithwindows

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent; Check: IsReadyToLaunch

[Code]
var
  DataDirPage: TInputDirWizardPage;
  PortConfigPage: TWizardPage;
  RbDefaultPorts: TRadioButton;
  RbCustomPorts: TRadioButton;
  LblBackendPort, LblMerchantPort, LblCustomerPort: TLabel;
  EdtBackendPort, EdtMerchantPort, EdtCustomerPort: TEdit;

  PageKitePage: TWizardPage;
  ChkEnablePageKite: TCheckBox;
  LblSubdomain, LblSecret: TLabel;
  EdtSubdomain, EdtSecret: TEdit;

  PrerequisitesVerified: Boolean;
  IsReinstallDetected: Boolean;

// ===============================================================================
// 1. LOGGING ENGINE (ProgramData permanent log & setup temp log)
// ===============================================================================
procedure WriteInstallerLog(const Msg: String);
var
  LogDir, LogFile, TimeStr, Line: String;
begin
  Log('[AutoPrint] ' + Msg);
  TimeStr := GetDateTimeString('yyyy-mm-dd hh:nn:ss', #0, #0);
  Line := '[' + TimeStr + '] ' + Msg + #13#10;

  try
    LogDir := ExpandConstant('{commonappdata}\AutoPrint\logs');
    ForceDirectories(LogDir);
    LogFile := LogDir + '\installer-' + GetDateTimeString('yyyymmdd', #0, #0) + '.log';
    SaveStringToFile(LogFile, Line, True);
    SaveStringToFile(ExpandConstant('{tmp}\autoprint-installer.log'), Line, True);
  except
  end;
end;

// ===============================================================================
// 2. WINDOWS VERSION & ARCHITECTURE INSPECTION
// ===============================================================================
function GetWindowsVersionSummary(): String;
var
  WinVer: TWindowsVersion;
begin
  GetWindowsVersionEx(WinVer);
  Result := Format('Windows NT %d.%d (Build %d, SP %d.%d)', [WinVer.Major, WinVer.Minor, WinVer.Build, WinVer.ServicePackMajor, WinVer.ServicePackMinor]);
end;

function Is64BitWindows(): Boolean;
begin
  Result := Is64BitInstallMode or IsWin64;
end;

function IsWindows7OrOlder(): Boolean;
var
  WinVer: TWindowsVersion;
begin
  GetWindowsVersionEx(WinVer);
  // Windows 7 is NT 6.1
  Result := (WinVer.Major < 6) or ((WinVer.Major = 6) and (WinVer.Minor <= 1));
end;

// ===============================================================================
// 3. PREREQUISITE DETECTION & VERIFICATION
// ===============================================================================

// Check for .NET Framework 4.0 or higher (CLR v4.0.30319)
function IsDotNet4Installed(var DetectedVer: String; var DetectedRelease: Cardinal): Boolean;
var
  DwInstall: Cardinal;
  DwRelease: Cardinal;
  StrVer: String;
  ClrDll64, ClrDll32: String;
  HasDll: Boolean;
begin
  Result := False;
  DetectedVer := '';
  DetectedRelease := 0;

  ClrDll64 := ExpandConstant('{win}\Microsoft.NET\Framework64\v4.0.30319\clr.dll');
  ClrDll32 := ExpandConstant('{win}\Microsoft.NET\Framework\v4.0.30319\clr.dll');
  HasDll := FileExists(ClrDll64) or FileExists(ClrDll32);

  // Check HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full
  if RegQueryDWordValue(HKEY_LOCAL_MACHINE, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Install', DwInstall) and (DwInstall = 1) then
  begin
    if RegQueryStringValue(HKEY_LOCAL_MACHINE, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Version', StrVer) then
      DetectedVer := StrVer;
    if RegQueryDWordValue(HKEY_LOCAL_MACHINE, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Release', DwRelease) then
      DetectedRelease := DwRelease;

    // Release >= 378389 is .NET 4.5+; any Install=1 in v4\Full indicates .NET 4.0+ is installed
    if HasDll or (StrVer <> '') then
    begin
      Result := True;
      Exit;
    end;
  end;

  // Fallback check HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Client
  if RegQueryDWordValue(HKEY_LOCAL_MACHINE, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Client', 'Install', DwInstall) and (DwInstall = 1) then
  begin
    if RegQueryStringValue(HKEY_LOCAL_MACHINE, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Client', 'Version', StrVer) then
      DetectedVer := StrVer;
    if RegQueryDWordValue(HKEY_LOCAL_MACHINE, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Client', 'Release', DwRelease) then
      DetectedRelease := DwRelease;

    if HasDll or (StrVer <> '') then
    begin
      Result := True;
      Exit;
    end;
  end;

  // If clr.dll is present on disk under v4.0.30319, runtime engine is available
  if HasDll then
  begin
    DetectedVer := '4.0.30319 (Filesystem)';
    Result := True;
  end;
end;

function VerifyDotNet4(): Boolean;
var
  VerStr: String;
  Rel: Cardinal;
begin
  Result := IsDotNet4Installed(VerStr, Rel);
end;

// Silent .NET Framework 4.5.2 Prerequisite Installer
function InstallDotNetPrerequisite(var NeedsRestart: Boolean): String;
var
  InstallerPath: String;
  ResultCode: Integer;
  VerStr: String;
  Rel: Cardinal;
begin
  Result := '';
  WriteInstallerLog('[PREREQ:DOTNET] Starting Microsoft .NET Framework 4.5.2 silent installation...');
  WizardForm.StatusLabel.Caption := 'Installing Microsoft .NET Framework (Prerequisite for AutoPrint Launcher)...';

  InstallerPath := ExpandConstant('{tmp}\NDP452-KB2901907-x86-x64-AllOS-ENU.exe');
  try
    ExtractTemporaryFile('NDP452-KB2901907-x86-x64-AllOS-ENU.exe');
  except
    Result := 'Failed to extract embedded .NET Framework 4.5.2 prerequisite installer.';
    WriteInstallerLog('[PREREQ:DOTNET:ERROR] ' + Result);
    Exit;
  end;

  if not FileExists(InstallerPath) then
  begin
    Result := 'Embedded .NET Framework prerequisite was not found in the package: ' + InstallerPath;
    WriteInstallerLog('[PREREQ:DOTNET:ERROR] ' + Result);
    Exit;
  end;

  WriteInstallerLog('[PREREQ:DOTNET] Executing silent installer: ' + InstallerPath + ' /q /norestart');
  if not Exec(InstallerPath, '/q /norestart', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    Result := 'Failed to launch Microsoft .NET Framework installer process.';
    WriteInstallerLog('[PREREQ:DOTNET:ERROR] ' + Result);
    Exit;
  end;

  WriteInstallerLog(Format('[PREREQ:DOTNET] Installer process completed with exit code: %d', [ResultCode]));

  // Handle exit codes: 0 = success, 3010 = reboot required
  if ResultCode = 3010 then
  begin
    WriteInstallerLog('[PREREQ:DOTNET:REBOOT] .NET Framework installer reported reboot required (exit code 3010).');
    NeedsRestart := True;
  end
  else if ResultCode <> 0 then
  begin
    Result := Format('Microsoft .NET Framework prerequisite installation failed with error code %d. AutoPrint cannot run without .NET Framework v4.0.30319.', [ResultCode]);
    WriteInstallerLog('[PREREQ:DOTNET:ERROR] ' + Result);
    Exit;
  end;

  // Independent verification
  if not VerifyDotNet4() then
  begin
    Result := 'Microsoft .NET Framework 4.5.2 was installed but independent post-install verification failed (registry/clr.dll check).';
    WriteInstallerLog('[PREREQ:DOTNET:ERROR] ' + Result);
    Exit;
  end;

  IsDotNet4Installed(VerStr, Rel);
  WriteInstallerLog(Format('[PREREQ:DOTNET:VERIFIED] Successfully verified .NET Framework: Version %s, Release %d', [VerStr, Rel]));
end;

// Node.js Detection and Verification
function GetNodeExePath(): String;
var
  StdPath, StdPath86, BundledPath: String;
begin
  StdPath := ExpandConstant('{pf}\nodejs\node.exe');
  if FileExists(StdPath) then
  begin
    Result := StdPath;
    Exit;
  end;
  StdPath86 := ExpandConstant('{pf32}\nodejs\node.exe');
  if FileExists(StdPath86) then
  begin
    Result := StdPath86;
    Exit;
  end;
  BundledPath := ExpandConstant('{app}\runtime\node\node.exe');
  if FileExists(BundledPath) then
  begin
    Result := BundledPath;
    Exit;
  end;
  Result := '';
end;

function IsNodeFunctional(): Boolean;
var
  NodePath: String;
  ResultCode: Integer;
begin
  NodePath := GetNodeExePath();
  if NodePath <> '' then
  begin
    if Exec(NodePath, '-v', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0) then
    begin
      Result := True;
      Exit;
    end;
  end;

  if Exec('node.exe', '-v', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0) then
  begin
    Result := True;
    Exit;
  end;

  Result := False;
end;

// Silent Node.js v20 LTS MSI Installer
function InstallNodeJsPrerequisite(var NeedsRestart: Boolean): String;
var
  MsiPath: String;
  ResultCode: Integer;
begin
  Result := '';
  WriteInstallerLog('[PREREQ:NODE] Starting Node.js prerequisite installation...');
  WizardForm.StatusLabel.Caption := 'Installing Node.js Runtime (Prerequisite for AutoPrint Microservices)...';

  MsiPath := ExpandConstant('{tmp}\node-v20.18.0-x64.msi');
  try
    ExtractTemporaryFile('node-v20.18.0-x64.msi');
  except
    Result := 'Failed to extract embedded Node.js prerequisite MSI installer.';
    WriteInstallerLog('[PREREQ:NODE:ERROR] ' + Result);
    Exit;
  end;

  if not FileExists(MsiPath) then
  begin
    Result := 'Embedded Node.js prerequisite MSI was not found in the package: ' + MsiPath;
    WriteInstallerLog('[PREREQ:NODE:ERROR] ' + Result);
    Exit;
  end;

  WriteInstallerLog('[PREREQ:NODE] Executing msiexec.exe /i "' + MsiPath + '" /qn /norestart');
  if not Exec('msiexec.exe', '/i "' + MsiPath + '" /qn /norestart', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    Result := 'Failed to launch Node.js MSI installer process.';
    WriteInstallerLog('[PREREQ:NODE:ERROR] ' + Result);
    Exit;
  end;

  WriteInstallerLog(Format('[PREREQ:NODE] MSI process completed with exit code: %d', [ResultCode]));

  if ResultCode = 3010 then
  begin
    WriteInstallerLog('[PREREQ:NODE:REBOOT] Node.js installer reported reboot required (exit code 3010).');
    NeedsRestart := True;
  end
  else if ResultCode <> 0 then
  begin
    Result := Format('Node.js prerequisite installation failed with error code %d. AutoPrint cannot run without Node.js.', [ResultCode]);
    WriteInstallerLog('[PREREQ:NODE:ERROR] ' + Result);
    Exit;
  end;

  // Independent verification
  if not IsNodeFunctional() then
  begin
    Result := 'Node.js was installed but could not be verified (node.exe -v failed). Please restart Windows and run AutoPrint Setup again.';
    WriteInstallerLog('[PREREQ:NODE:ERROR] ' + Result);
    Exit;
  end;

  WriteInstallerLog('[PREREQ:NODE:VERIFIED] Successfully verified Node.js runtime.');
end;

// ===============================================================================
// 4. UI EVENT HANDLERS & WIZARD INITIALIZATION
// ===============================================================================
procedure RbPortsClick(Sender: TObject);
begin
  EdtBackendPort.Enabled := RbCustomPorts.Checked;
  EdtMerchantPort.Enabled := RbCustomPorts.Checked;
  EdtCustomerPort.Enabled := RbCustomPorts.Checked;
  if RbDefaultPorts.Checked then
  begin
    EdtBackendPort.Text := '5000';
    EdtMerchantPort.Text := '8000';
    EdtCustomerPort.Text := '7000';
  end;
end;

procedure ChkPageKiteClick(Sender: TObject);
begin
  EdtSubdomain.Enabled := ChkEnablePageKite.Checked;
  EdtSecret.Enabled := ChkEnablePageKite.Checked;
end;

procedure InitializeWizard;
begin
  // 1. Application Data Directory Page (C:\ProgramData\AutoPrint)
  DataDirPage := CreateInputDirPage(
    wpSelectDir,
    'Select Application Data Directory',
    'Where should AutoPrint store its persistent database, merchant settings, and logs?',
    'Select the folder where AutoPrint will store mutable data and persistent SQLite databases.'#13#10 +
    'This directory is preserved during application updates and reinstalls.',
    False,
    ''
  );
  DataDirPage.Add('');
  DataDirPage.Values[0] := ExpandConstant('{commonappdata}\AutoPrint');

  // 2. Service TCP Port Configuration Page
  PortConfigPage := CreateCustomPage(
    DataDirPage.ID,
    'Service Port Configuration',
    'Configure the TCP ports for AutoPrint internal services.'
  );

  RbDefaultPorts := TRadioButton.Create(PortConfigPage);
  RbDefaultPorts.Parent := PortConfigPage.Surface;
  RbDefaultPorts.Top := ScaleY(10);
  RbDefaultPorts.Left := ScaleX(10);
  RbDefaultPorts.Width := PortConfigPage.SurfaceWidth - ScaleX(20);
  RbDefaultPorts.Caption := 'Use standard production ports (Backend: 5000, Merchant: 8000, Customer: 7000)';
  RbDefaultPorts.Checked := True;
  RbDefaultPorts.OnClick := @RbPortsClick;

  RbCustomPorts := TRadioButton.Create(PortConfigPage);
  RbCustomPorts.Parent := PortConfigPage.Surface;
  RbCustomPorts.Top := ScaleY(35);
  RbCustomPorts.Left := ScaleX(10);
  RbCustomPorts.Width := PortConfigPage.SurfaceWidth - ScaleX(20);
  RbCustomPorts.Caption := 'Customize service TCP port bindings';
  RbCustomPorts.Checked := False;
  RbCustomPorts.OnClick := @RbPortsClick;

  LblBackendPort := TLabel.Create(PortConfigPage);
  LblBackendPort.Parent := PortConfigPage.Surface;
  LblBackendPort.Top := ScaleY(70);
  LblBackendPort.Left := ScaleX(30);
  LblBackendPort.Caption := 'Backend API Port:';

  EdtBackendPort := TEdit.Create(PortConfigPage);
  EdtBackendPort.Parent := PortConfigPage.Surface;
  EdtBackendPort.Top := ScaleY(67);
  EdtBackendPort.Left := ScaleX(200);
  EdtBackendPort.Width := ScaleX(80);
  EdtBackendPort.Text := '5000';
  EdtBackendPort.Enabled := False;

  LblMerchantPort := TLabel.Create(PortConfigPage);
  LblMerchantPort.Parent := PortConfigPage.Surface;
  LblMerchantPort.Top := ScaleY(102);
  LblMerchantPort.Left := ScaleX(30);
  LblMerchantPort.Caption := 'Merchant Desktop Port:';

  EdtMerchantPort := TEdit.Create(PortConfigPage);
  EdtMerchantPort.Parent := PortConfigPage.Surface;
  EdtMerchantPort.Top := ScaleY(99);
  EdtMerchantPort.Left := ScaleX(200);
  EdtMerchantPort.Width := ScaleX(80);
  EdtMerchantPort.Text := '8000';
  EdtMerchantPort.Enabled := False;

  LblCustomerPort := TLabel.Create(PortConfigPage);
  LblCustomerPort.Parent := PortConfigPage.Surface;
  LblCustomerPort.Top := ScaleY(135);
  LblCustomerPort.Left := ScaleX(30);
  LblCustomerPort.Caption := 'Customer Kiosk Port:';

  EdtCustomerPort := TEdit.Create(PortConfigPage);
  EdtCustomerPort.Parent := PortConfigPage.Surface;
  EdtCustomerPort.Top := ScaleY(132);
  EdtCustomerPort.Left := ScaleX(200);
  EdtCustomerPort.Width := ScaleX(80);
  EdtCustomerPort.Text := '7000';
  EdtCustomerPort.Enabled := False;

  // 3. PageKite Configuration Page
  PageKitePage := CreateCustomPage(
    PortConfigPage.ID,
    'Customer Remote Access (Optional PageKite Setup)',
    'Configure PageKite to optionally expose the customer kiosk over the internet.'
  );

  ChkEnablePageKite := TCheckBox.Create(PageKitePage);
  ChkEnablePageKite.Parent := PageKitePage.Surface;
  ChkEnablePageKite.Top := ScaleY(10);
  ChkEnablePageKite.Left := ScaleX(10);
  ChkEnablePageKite.Width := PageKitePage.SurfaceWidth - ScaleX(20);
  ChkEnablePageKite.Caption := 'Configure PageKite for Customer Online Access now (Optional)';
  ChkEnablePageKite.Checked := False;
  ChkEnablePageKite.OnClick := @ChkPageKiteClick;

  LblSubdomain := TLabel.Create(PageKitePage);
  LblSubdomain.Parent := PageKitePage.Surface;
  LblSubdomain.Top := ScaleY(45);
  LblSubdomain.Left := ScaleX(30);
  LblSubdomain.Caption := 'PageKite Kite Name:';

  EdtSubdomain := TEdit.Create(PageKitePage);
  EdtSubdomain.Parent := PageKitePage.Surface;
  EdtSubdomain.Top := ScaleY(42);
  EdtSubdomain.Left := ScaleX(230);
  EdtSubdomain.Width := ScaleX(180);
  EdtSubdomain.Text := '';
  EdtSubdomain.Enabled := False;

  LblSecret := TLabel.Create(PageKitePage);
  LblSecret.Parent := PageKitePage.Surface;
  LblSecret.Top := ScaleY(75);
  LblSecret.Left := ScaleX(30);
  LblSecret.Caption := 'PageKite Secret Key:';

  EdtSecret := TEdit.Create(PageKitePage);
  EdtSecret.Parent := PageKitePage.Surface;
  EdtSecret.Top := ScaleY(72);
  EdtSecret.Left := ScaleX(230);
  EdtSecret.Width := ScaleX(180);
  EdtSecret.Text := '';
  EdtSecret.PasswordChar := '*';
  EdtSecret.Enabled := False;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  p1, p2, p3: Integer;
begin
  Result := True;

  if CurPageID = PortConfigPage.ID then
  begin
    p1 := StrToIntDef(EdtBackendPort.Text, 0);
    p2 := StrToIntDef(EdtMerchantPort.Text, 0);
    p3 := StrToIntDef(EdtCustomerPort.Text, 0);

    if (p1 < 1024) or (p1 > 65535) or (p2 < 1024) or (p2 > 65535) or (p3 < 1024) or (p3 > 65535) then
    begin
      MsgBox('Please enter valid TCP port numbers between 1024 and 65535.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if (p1 = p2) or (p1 = p3) or (p2 = p3) then
    begin
      MsgBox('Each service port must be unique. Backend, Merchant, and Customer ports cannot conflict.', mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end;

  if CurPageID = PageKitePage.ID then
  begin
    if ChkEnablePageKite.Checked then
    begin
      if (Trim(EdtSubdomain.Text) = '') then
      begin
        MsgBox('Please enter your PageKite Kite Name (e.g. myprintshop.pagekite.me).', mbError, MB_OK);
        Result := False;
        Exit;
      end;

      if (Pos(' ', EdtSubdomain.Text) > 0) or (Pos('&', EdtSubdomain.Text) > 0) or (Pos(';', EdtSubdomain.Text) > 0) or (Pos('|', EdtSubdomain.Text) > 0) or (Pos('>', EdtSubdomain.Text) > 0) or (Pos('<', EdtSubdomain.Text) > 0) then
      begin
        MsgBox('PageKite Kite Name contains invalid characters or spaces.', mbError, MB_OK);
        Result := False;
        Exit;
      end;

      if (Trim(EdtSecret.Text) = '') then
      begin
        MsgBox('Please enter your PageKite Secret Key.', mbError, MB_OK);
        Result := False;
        Exit;
      end;
    end;
  end;
end;

function EscapeJsonPath(const S: String): String;
var
  Temp: String;
begin
  Temp := S;
  StringChange(Temp, '\', '\\');
  Result := Temp;
end;

function BoolToJsStr(const B: Boolean): String;
begin
  if B then
    Result := 'true'
  else
    Result := 'false';
end;

// ===============================================================================
// 5. PRE-INSTALL PREREQUISITE ORCHESTRATOR
// ===============================================================================
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
  DotNetVer: String;
  DotNetRel: Cardinal;
  DotNetOk, NodeOk: Boolean;
  PrereqError: String;
begin
  Result := '';
  PrerequisitesVerified := False;

  WriteInstallerLog('===============================================================================');
  WriteInstallerLog('   AUTOPRINT EXPRESS WINDOWS INSTALLATION PROCESS LAUNCHED');
  WriteInstallerLog('   Installer Version   : ' + ExpandConstant('{#MyAppVersion}'));
  WriteInstallerLog('   Detected OS         : ' + GetWindowsVersionSummary());
  WriteInstallerLog('   64-Bit Architecture : ' + BoolToJsStr(Is64BitWindows()));
  WriteInstallerLog('===============================================================================');

  // Terminate any running AutoPrint instance cleanly
  Exec('taskkill.exe', '/F /IM AutoPrint.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  // Validate 64-bit architecture
  if not Is64BitWindows() then
  begin
    Result := 'AutoPrint Express requires a 64-bit (x64) Windows operating system.';
    WriteInstallerLog('[SYSTEM:FAIL] ' + Result);
    Exit;
  end;

  // Inspect Windows 7 compatibility environment
  if IsWindows7OrOlder() then
  begin
    WriteInstallerLog('[SYSTEM:WARN] Running on Windows 7 / NT 6.1. .NET 4.5.2 prerequisite is fully supported, but Node.js 18+ may encounter OS API limitations.');
  end;

  // -------------------------------------------------------------------------
  // PREREQUISITE 1: Microsoft .NET Framework (CLR v4.0.30319)
  // Required by AutoPrint.exe native launcher & tray process manager
  // -------------------------------------------------------------------------
  DotNetOk := IsDotNet4Installed(DotNetVer, DotNetRel);
  if DotNetOk then
  begin
    WriteInstallerLog(Format('[PREREQ:DOTNET:PASS] Microsoft .NET Framework v4.0.30319 is already installed and verified (Version: %s, Release: %d). Skipping.', [DotNetVer, DotNetRel]));
  end
  else
  begin
    WriteInstallerLog('[PREREQ:DOTNET:MISSING] .NET Framework v4.0.30319 was not detected. Initiating silent prerequisite installation...');
    PrereqError := InstallDotNetPrerequisite(NeedsRestart);
    if PrereqError <> '' then
    begin
      Result := PrereqError;
      Exit;
    end;
  end;

  // -------------------------------------------------------------------------
  // PREREQUISITE 2: Node.js Runtime (v18+ / v20 LTS x64)
  // Required by AutoPrint microservices (Backend API, Kiosk, POS Desk)
  // -------------------------------------------------------------------------
  NodeOk := IsNodeFunctional();
  if NodeOk then
  begin
    WriteInstallerLog('[PREREQ:NODE:PASS] Node.js runtime is already installed and functional. Skipping.');
  end
  else
  begin
    WriteInstallerLog('[PREREQ:NODE:MISSING] Node.js runtime was not detected. Initiating silent prerequisite installation...');
    PrereqError := InstallNodeJsPrerequisite(NeedsRestart);
    if PrereqError <> '' then
    begin
      Result := PrereqError;
      Exit;
    end;
  end;

  PrerequisitesVerified := True;
  WriteInstallerLog('[PREREQ:ALL_VERIFIED] All runtime prerequisites successfully installed and verified.');
end;

// ===============================================================================
// 6. POST-INSTALL INITIALIZATION & DATA PROTECTION
// ===============================================================================
procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigDir, ConfigFile, InstConfigFile, JsonContent, InstJsonContent, EnvContent, TargetDataDir, TestArg: String;
  PKResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    TargetDataDir := DataDirPage.Values[0];
    ConfigDir := TargetDataDir + '\config';
    ConfigFile := ConfigDir + '\appsettings.json';
    InstConfigFile := ConfigDir + '\installation.json';

    // Create persistent application data directories in ProgramData
    ForceDirectories(ConfigDir);
    ForceDirectories(TargetDataDir + '\datastore\backend\database');
    ForceDirectories(TargetDataDir + '\datastore\uploads');
    ForceDirectories(TargetDataDir + '\logs');

    // Check if this is a reinstall / upgrade
    IsReinstallDetected := FileExists(ConfigFile) or FileExists(TargetDataDir + '\datastore\backend\database\autoprint.db');
    if IsReinstallDetected then
    begin
      WriteInstallerLog('[DATA:PRESERVE] Existing AutoPrint installation detected. Preserving merchant database and configuration.');
    end
    else
    begin
      WriteInstallerLog('[DATA:INIT] Fresh installation detected. Initializing default appsettings.json and state.');
      // Generate authoritative appsettings.json for fresh installation
      JsonContent :=
        '{' + #13#10 +
        '  "installationId": "ap-' + GetDateTimeString('yyyymmdd-hhnnss', #0, #0) + '",' + #13#10 +
        '  "backendPort": ' + EdtBackendPort.Text + ',' + #13#10 +
        '  "customerWebPort": ' + EdtCustomerPort.Text + ',' + #13#10 +
        '  "merchantDesktopPort": ' + EdtMerchantPort.Text + ',' + #13#10 +
        '  "apiBaseUrl": "http://127.0.0.1:' + EdtBackendPort.Text + '",' + #13#10 +
        '  "ports": {' + #13#10 +
        '    "backend": ' + EdtBackendPort.Text + ',' + #13#10 +
        '    "merchant": ' + EdtMerchantPort.Text + ',' + #13#10 +
        '    "customer": ' + EdtCustomerPort.Text + #13#10 +
        '  },' + #13#10 +
        '  "paths": {' + #13#10 +
        '    "dataDirectory": "' + EscapeJsonPath(TargetDataDir + '\datastore') + '",' + #13#10 +
        '    "logsDirectory": "' + EscapeJsonPath(TargetDataDir + '\logs') + '"' + #13#10 +
        '  },' + #13#10 +
        '  "database": {' + #13#10 +
        '    "path": "' + EscapeJsonPath(TargetDataDir + '\datastore\backend\database\autoprint.db') + '"' + #13#10 +
        '  },' + #13#10 +
        '  "pagekite": {' + #13#10 +
        '    "enabled": ' + BoolToJsStr(ChkEnablePageKite.Checked) + ',' + #13#10 +
        '    "subdomain": "' + EdtSubdomain.Text + '",' + #13#10 +
        '    "domain": "pagekite.me",' + #13#10 +
        '    "secret": "' + EdtSecret.Text + '"' + #13#10 +
        '  },' + #13#10 +
        '  "updatedAt": "' + GetDateTimeString('yyyy-mm-dd"T"hh:nn:ss"Z"', #0, #0) + '"' + #13#10 +
        '}';

      SaveStringToFile(ConfigFile, JsonContent, False);
    end;

    // Synchronize installation.json (marking installed: true so AutoPrint.exe launches directly into tray)
    InstJsonContent :=
      '{' + #13#10 +
      '  "installed": true,' + #13#10 +
      '  "version": "' + ExpandConstant('{#MyAppVersion}') + '",' + #13#10 +
      '  "installedAt": "' + GetDateTimeString('yyyy-mm-dd"T"hh:nn:ss"Z"', #0, #0) + '",' + #13#10 +
      '  "pagekiteConfigured": ' + BoolToJsStr(ChkEnablePageKite.Checked) + ',' + #13#10 +
      '  "pagekiteName": "' + EdtSubdomain.Text + '",' + #13#10 +
      '  "pagekiteSecret": "' + EdtSecret.Text + '",' + #13#10 +
      '  "pagekitePublicUrl": "https://' + EdtSubdomain.Text + '.pagekite.me",' + #13#10 +
      '  "backendPort": ' + EdtBackendPort.Text + ',' + #13#10 +
      '  "customerPort": ' + EdtCustomerPort.Text + ',' + #13#10 +
      '  "merchantPort": ' + EdtMerchantPort.Text + #13#10 +
      '}';
    SaveStringToFile(InstConfigFile, InstJsonContent, False);

    // Write .env into {app} for runtime backward compatibility
    EnvContent :=
      'PORT=' + EdtBackendPort.Text + #13#10 +
      'BACKEND_PORT=' + EdtBackendPort.Text + #13#10 +
      'MERCHANT_PORT=' + EdtMerchantPort.Text + #13#10 +
      'CUSTOMER_PORT=' + EdtCustomerPort.Text + #13#10 +
      'PAGEKITE_ENABLED=' + BoolToJsStr(ChkEnablePageKite.Checked) + #13#10 +
      'PAGEKITE_NAME=' + EdtSubdomain.Text + #13#10 +
      'PAGEKITE_SECRET=' + EdtSecret.Text + #13#10 +
      'AUTOPRINT_DATA_DIR=' + TargetDataDir + '\datastore' + #13#10 +
      'NODE_ENV=production' + #13#10;

    SaveStringToFile(ExpandConstant('{app}\.env'), EnvContent, False);

    // Generate dynamic desktop and start menu shortcuts with exact selected ports
    SaveStringToFile(ExpandConstant('{group}\Merchant Dashboard.url'),
      '[InternetShortcut]' + #13#10 +
      'URL=http://localhost:' + EdtMerchantPort.Text + #13#10 +
      'IconFile=' + ExpandConstant('{app}\assets\icon\autoprint.ico') + #13#10 +
      'IconIndex=0' + #13#10, False);

    SaveStringToFile(ExpandConstant('{group}\Customer Kiosk Portal.url'),
      '[InternetShortcut]' + #13#10 +
      'URL=http://localhost:' + EdtCustomerPort.Text + #13#10 +
      'IconFile=' + ExpandConstant('{app}\assets\icon\autoprint.ico') + #13#10 +
      'IconIndex=0' + #13#10, False);

    if WizardIsTaskSelected('desktopicon') then
    begin
      SaveStringToFile(ExpandConstant('{autodesktop}\Merchant Dashboard.url'),
        '[InternetShortcut]' + #13#10 +
        'URL=http://localhost:' + EdtMerchantPort.Text + #13#10 +
        'IconFile=' + ExpandConstant('{app}\assets\icon\autoprint.ico') + #13#10 +
        'IconIndex=0' + #13#10, False);

      SaveStringToFile(ExpandConstant('{autodesktop}\Customer Kiosk.url'),
        '[InternetShortcut]' + #13#10 +
        'URL=http://localhost:' + EdtCustomerPort.Text + #13#10 +
        'IconFile=' + ExpandConstant('{app}\assets\icon\autoprint.ico') + #13#10 +
        'IconIndex=0' + #13#10, False);
    end;

    // Optional PageKite configuration
    if ChkEnablePageKite.Checked then
    begin
      TestArg := '-SkipTest';
      if MsgBox('PageKite configuration was saved.'#13#10#13#10 +
                'Do you want to test the PageKite connection now?', mbConfirmation, MB_YESNO) = IDYES then
      begin
        TestArg := '-TestConnection';
      end;

      WizardForm.StatusLabel.Caption := 'Configuring PageKite CLI and secure tunnel settings...';
      Exec('powershell.exe',
        '-NoProfile -ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\installer\scripts\configure-pagekite.ps1') + '" ' +
        '-AppDir "' + ExpandConstant('{app}') + '" ' +
        '-KiteName "' + EdtSubdomain.Text + '" ' +
        '-SecretKey "' + EdtSecret.Text + '" ' +
        '-CustomerPort ' + EdtCustomerPort.Text + ' ' +
        TestArg + ' -NonInteractive',
        ExpandConstant('{app}'),
        SW_HIDE,
        ewWaitUntilTerminated,
        PKResultCode
      );

      if PKResultCode <> 0 then
      begin
        MsgBox('Notice: PageKite configuration completed with notice code ' + IntToStr(PKResultCode) + '.'#13#10 +
               'You can run or test your PageKite tunnel anytime via Start-Customer-Tunnel.cmd.', mbInformation, MB_OK);
      end;
    end;

    // Final Readiness Verification
    if FileExists(ExpandConstant('{app}\{#MyAppExeName}')) and
       FileExists(ExpandConstant('{app}\app\backend\dist\server.js')) then
    begin
      WriteInstallerLog('[READINESS:PASS] AutoPrint binary payload and backend engine validated successfully.');
    end
    else
    begin
      WriteInstallerLog('[READINESS:WARN] Some application binaries could not be validated on disk.');
    end;

    WriteInstallerLog('[FINISH] AutoPrint Express installation completed successfully.');
  end;
end;

// Guard function for [Run] section: ensures prerequisites and payload are verified before launch
function IsReadyToLaunch(): Boolean;
begin
  Result := PrerequisitesVerified and FileExists(ExpandConstant('{app}\{#MyAppExeName}'));
end;

// ===============================================================================
// 7. UNINSTALLATION ENGINE
// ===============================================================================
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    // Terminate AutoPrint.exe only (AutoPrint.exe shuts down its own child services)
    Exec('taskkill.exe', '/F /IM AutoPrint.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;

  if CurUninstallStep = usPostUninstall then
  begin
    // Ask user if they wish to remove persistent database and merchant data
    if MsgBox('Do you also want to delete all AutoPrint merchant databases, settings, and logs in ProgramData?', mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES then
    begin
      DelTree(ExpandConstant('{commonappdata}\AutoPrint'), True, True, True);
    end;
  end;
end;
