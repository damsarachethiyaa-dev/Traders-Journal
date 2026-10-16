Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
If fso.FileExists("C:\GPT\local\dist\win-unpacked\Traders Journal.exe") Then
    WshShell.CurrentDirectory = "C:\GPT\local\dist\win-unpacked"
    WshShell.Run """C:\GPT\local\dist\win-unpacked\Traders Journal.exe""", 1, False
ElseIf fso.FileExists("C:\GPT\local\dist\video-edition\win-unpacked\Traders Journal.exe") Then
    WshShell.CurrentDirectory = "C:\GPT\local\dist\video-edition\win-unpacked"
    WshShell.Run """C:\GPT\local\dist\video-edition\win-unpacked\Traders Journal.exe""", 1, False
Else
    WshShell.Run """C:\Users\LEGION\AppData\Local\Programs\Traders Journal\Traders Journal.exe""", 1, False
End If
