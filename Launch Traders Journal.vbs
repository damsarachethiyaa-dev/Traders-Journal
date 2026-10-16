Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\GPT\local\dist\video-edition\win-unpacked"
WshShell.Run """C:\GPT\local\dist\video-edition\win-unpacked\Traders Journal.exe""", 1, False
