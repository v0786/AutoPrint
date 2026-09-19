; ===============================================================================
;   QRPrint — PRODUCTION WINDOWS INSTALLER SCRIPT (Inno Setup 6)
;   Target Operating Systems: Windows 7 (SP1 64-bit), Windows 10, Windows 11
;   Output: release\QRPrint-Setup.exe
; ===============================================================================

#define MyAppName "AutoPrint"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "AutoPrint Engineering"
#define MyAppURL "https://autoprint.pagekite.me"
#define MyAppExeName "AutoPrint.exe"

[Setup]
AppId={{E58C4F81-9A34-4C21-829D-6E5C8B44A723}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\AutoPrint
DefaultGroupName=AutoPrint
AllowNoIcons=yes
OutputDir=..\release
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
Name: "full"; Description: "Full Print Station (Merchant PC + Local Kiosk + Hardware Spooler)"
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
Name: "{localappdata}\{#MyAppName}"; Permissions: users-full
Name: "{localappdata}\{#MyAppName}\database"; Permissions: users-full
Name: "{localappdata}\{#MyAppName}\qr"; Permissions: users-full
Name: "{localappdata}\{#MyAppName}\documents"; Permissions: users-full
Name: "{localappdata}\{#MyAppName}\backups"; Permissions: users-full
Name: "{localappdata}\{#MyAppName}\logs"; Permissions: users-full
Name: "{localappdata}\{#MyAppName}\cache"; Permissions: users-full
Name: "{localappdata}\{#MyAppName}\settings"; Permissions: users-full

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
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"; IconFilename: "{app}\assets\icon\autoprint.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon; IconFilename: "{app}\assets\icon\autoprint.ico"

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
  PrerequisitesVerified: Boolean;
  IsReinstallDetected: Boolean;

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

function IsDotNet45Installed(): Boolean;
var
  ReleaseKey: Cardinal;
begin
  Result := False;
  if RegQueryDWordValue(HKLM, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Release', ReleaseKey) then
  begin
    if ReleaseKey >= 378389 then
      Result := True;
  end;
end;

function IsNodeJsInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('where.exe', 'node.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
  if not Result then
  begin
    Result := FileExists(ExpandConstant('{pf}\nodejs\node.exe')) or
              FileExists(ExpandConstant('{pf32}\nodejs\node.exe')) or
              FileExists(ExpandConstant('{localappdata}\Programs\nodejs\node.exe'));
  end;
end;

procedure InitializeWizard();
begin
  WriteInstallerLog('[INIT] QRPrint installer initializing. Target platform: Windows 7 / 10 / 11.');

  // Check if previous installation exists
  IsReinstallDetected := DirExists(ExpandConstant('{app}')) or
                         FileExists(ExpandConstant('{app}\{#MyAppExeName}'));

  if IsReinstallDetected then
  begin
    WriteInstallerLog('[UPGRADE] Existing QRPrint installation detected at ' + ExpandConstant('{app}') + '. User databases will be preserved.');
  end;

  // Custom Port Configuration Page
  PortConfigPage := CreateCustomPage(wpSelectDir,
    'Network Port Configuration',
    'Configure the local network ports for QRPrint services.');

  RbDefaultPorts := TRadioButton.Create(PortConfigPage);
  RbDefaultPorts.Parent := PortConfigPage.Surface;
  RbDefaultPorts.Caption := 'Use standard default ports (Backend: 5000, Merchant Desk: 8000, Customer Kiosk: 7000)';
  RbDefaultPorts.Top := ScaleY(10);
  RbDefaultPorts.Left := ScaleX(10);
  RbDefaultPorts.Width := ScaleX(450);
  RbDefaultPorts.Checked := True;

  RbCustomPorts := TRadioButton.Create(PortConfigPage);
  RbCustomPorts.Parent := PortConfigPage.Surface;
  RbCustomPorts.Caption := 'Custom port configuration (resolve local port conflicts)';
  RbCustomPorts.Top := ScaleY(40);
  RbCustomPorts.Left := ScaleX(10);
  RbCustomPorts.Width := ScaleX(450);

  LblBackendPort := TLabel.Create(PortConfigPage);
  LblBackendPort.Parent := PortConfigPage.Surface;
  LblBackendPort.Caption := 'Backend Port:';
  LblBackendPort.Top := ScaleY(80);
  LblBackendPort.Left := ScaleX(30);

  EdtBackendPort := TEdit.Create(PortConfigPage);
  EdtBackendPort.Parent := PortConfigPage.Surface;
  EdtBackendPort.Text := '5000';
  EdtBackendPort.Top := ScaleY(76);
  EdtBackendPort.Left := ScaleX(150);
  EdtBackendPort.Width := ScaleX(70);

  LblMerchantPort := TLabel.Create(PortConfigPage);
  LblMerchantPort.Parent := PortConfigPage.Surface;
  LblMerchantPort.Caption := 'Merchant Desk Port:';
  LblMerchantPort.Top := ScaleY(115);
  LblMerchantPort.Left := ScaleX(30);

  EdtMerchantPort := TEdit.Create(PortConfigPage);
  EdtMerchantPort.Parent := PortConfigPage.Surface;
  EdtMerchantPort.Text := '8000';
  EdtMerchantPort.Top := ScaleY(111);
  EdtMerchantPort.Left := ScaleX(150);
  EdtMerchantPort.Width := ScaleX(70);

  LblCustomerPort := TLabel.Create(PortConfigPage);
  LblCustomerPort.Parent := PortConfigPage.Surface;
  LblCustomerPort.Caption := 'Customer Kiosk Port:';
  LblCustomerPort.Top := ScaleY(150);
  LblCustomerPort.Left := ScaleX(30);

  EdtCustomerPort := TEdit.Create(PortConfigPage);
  EdtCustomerPort.Parent := PortConfigPage.Surface;
  EdtCustomerPort.Text := '7000';
  EdtCustomerPort.Top := ScaleY(146);
  EdtCustomerPort.Left := ScaleX(150);
  EdtCustomerPort.Width := ScaleX(70);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  ConfigJson: String;
  ConfigDir: String;
begin
  if CurStep = ssInstall then
  begin
    // Check and install .NET Framework 4.5.2 if missing
    if not IsDotNet45Installed() then
    begin
      ExtractTemporaryFile('NDP452-KB2901907-x86-x64-AllOS-ENU.exe');
      WizardForm.StatusLabel.Caption := 'Installing Microsoft .NET Framework 4.5.2...';
      Exec(ExpandConstant('{tmp}\NDP452-KB2901907-x86-x64-AllOS-ENU.exe'),
        '/q /norestart', '', SW_SHOW, ewWaitUntilTerminated, ResultCode);
      WriteInstallerLog('[PREREQ:.NET] .NET Framework installation returned: ' + IntToStr(ResultCode));
    end;

    // Check and install Node.js if missing
    if not IsNodeJsInstalled() then
    begin
      ExtractTemporaryFile('node-v20.18.0-x64.msi');
      WizardForm.StatusLabel.Caption := 'Installing Node.js runtime engine...';
      Exec('msiexec.exe',
        '/i "' + ExpandConstant('{tmp}\node-v20.18.0-x64.msi') + '" /qn /norestart',
        '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      WriteInstallerLog('[PREREQ:NODE] Node.js MSI installation returned: ' + IntToStr(ResultCode));
    end;
  end;

  if CurStep = ssPostInstall then
  begin
    PrerequisitesVerified := True;

    // Write appsettings.json to %ProgramData%\AutoPrint\config and %ProgramData%\QRPrint\config
    ConfigJson := '{' + #13#10 +
      '  "installationId": "QRPRINT-PROD-2026",' + #13#10 +
      '  "backendPort": ' + EdtBackendPort.Text + ',' + #13#10 +
      '  "merchantDesktopPort": ' + EdtMerchantPort.Text + ',' + #13#10 +
      '  "customerWebPort": ' + EdtCustomerPort.Text + ',' + #13#10 +
      '  "apiBaseUrl": "http://127.0.0.1:' + EdtBackendPort.Text + '",' + #13#10 +
      '  "ports": {' + #13#10 +
      '    "backend": ' + EdtBackendPort.Text + ',' + #13#10 +
      '    "merchant": ' + EdtMerchantPort.Text + ',' + #13#10 +
      '    "customer": ' + EdtCustomerPort.Text + #13#10 +
      '  },' + #13#10 +
      '  "paths": {' + #13#10 +
      '    "dataDirectory": "C:\\ProgramData\\AutoPrint\\datastore",' + #13#10 +
      '    "logsDirectory": "C:\\ProgramData\\AutoPrint\\logs"' + #13#10 +
      '  }' + #13#10 +
      '}';

    ConfigDir := ExpandConstant('{commonappdata}\AutoPrint\config');
    ForceDirectories(ConfigDir);
    SaveStringToFile(ConfigDir + '\appsettings.json', ConfigJson, False);

    ConfigDir := ExpandConstant('{commonappdata}\QRPrint\config');
    ForceDirectories(ConfigDir);
    SaveStringToFile(ConfigDir + '\appsettings.json', ConfigJson, False);

    WriteInstallerLog('[POSTINSTALL] Configuration written to ProgramData. Preserving all existing user database records.');
  end;
end;

function IsReadyToLaunch(): Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\{#MyAppExeName}'));
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    Exec('taskkill.exe', '/F /IM AutoPrint.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;

  if CurUninstallStep = usPostUninstall then
  begin
    // Preserve user data unless explicitly confirmed for deletion
    if MsgBox('Do you also want to delete all local QRPrint merchant databases, settings, and logs?', mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES then
    begin
      DelTree(ExpandConstant('{commonappdata}\QRPrint'), True, True, True);
      DelTree(ExpandConstant('{localappdata}\QRPrint'), True, True, True);
      DelTree(ExpandConstant('{commonappdata}\AutoPrint'), True, True, True);
    end;
  end;
end;
