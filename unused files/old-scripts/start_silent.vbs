' AutoPrint 24x7 Silent Background Server Launcher
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

strPath = fso.GetParentFolderName(WScript.ScriptFullName)
baseDir = strPath & "\AUTOPRINT fixed"

cmdBackend = "cmd /c cd /d """ & baseDir & "\backend"" && npm run dev"
cmdMerchant = "cmd /c cd /d """ & baseDir & "\merchant-desktop"" && npm run dev"
cmdCustomer = "cmd /c cd /d """ & baseDir & "\customer-web"" && npm run dev"

WshShell.Run cmdBackend, 0, False
WshShell.Run cmdMerchant, 0, False
WshShell.Run cmdCustomer, 0, False
