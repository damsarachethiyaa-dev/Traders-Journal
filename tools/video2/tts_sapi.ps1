param([string]$Json,[string]$Out)
Add-Type -AssemblyName System.Speech
$items = Get-Content -Raw -Encoding UTF8 $Json | ConvertFrom-Json
New-Item -ItemType Directory -Force $Out | Out-Null
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$i = 0
foreach ($it in $items) {
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SelectVoice('Microsoft Zira Desktop'); $s.Rate = 1; $s.Volume = 100
  $s.SetOutputToWaveFile((Join-Path $Out ("L$i.wav")), $fmt)
  $s.Speak($it.speak); $s.Dispose(); $i++
}
