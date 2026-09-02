; Inno Setup Script for AutoPrint Production Installer (.exe)
; Requires Inno Setup Compiler (iscc.exe)

[Setup]
AppName=AutoPrint System
AppVersion=1.0.0
AppPublisher=AutoPrint Solutions
DefaultDirName=C:\AutoPrint
DefaultGroupName=AutoPrint System
OutputDir=.\dist_installer
OutputBaseFilename=AutoPrint_Setup_v1.0.0
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=admin
SetupIconFile=merchant-desktop\public\favicon.ico
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "installer.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "install.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "backend\*"; DestDir: "{app}\App\backend"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "merchant-desktop\*"; DestDir: "{app}\App\merchant-desktop"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "customer-web\*"; DestDir: "{app}\App\customer-web"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{app}\Config"
Name: "{app}\Data\Database"
Name: "{app}\Data\Templates"
Name: "{app}\Logs\Application"
Name: "{app}\Logs\Error"
Name: "{app}\Logs\Print"
Name: "{app}\Output\QR"
Name: "{app}\Output\PDF"
Name: "{app}\Backup"
Name: "{app}\Temp"

[Icons]
Name: "{group}\AutoPrint System"; Filename: "{app}\installer.bat"
Name: "{autodesktop}\AutoPrint System"; Filename: "{app}\installer.bat"; Tasks: desktopicon

[Run]
Filename: "{app}\installer.bat"; Description: "Launch AutoPrint System Setup"; Flags: postinstall shellexec
