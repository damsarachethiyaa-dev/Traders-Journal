Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
' Only start copies inside this project folder or the per-user install, never a fixed folder other users could create.
here = fso.GetParentFolderName(WScript.ScriptFullName)
installed = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\Traders Journal\Traders Journal.exe"
For Each exe In Array(here & "\dist\win-unpacked\Traders Journal.exe", here & "\dist\video-edition\win-unpacked\Traders Journal.exe", installed)
    If fso.FileExists(exe) Then
        WshShell.CurrentDirectory = fso.GetParentFolderName(exe)
        WshShell.Run """" & exe & """", 1, False
        WScript.Quit
    End If
Next
MsgBox "Traders Journal is not built or installed yet. Run build_installer.bat or install it first.", 48, "Traders Journal"
