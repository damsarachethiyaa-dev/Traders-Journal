param([string]$Storyboard,[string]$Out)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$story = Get-Content -Raw -Encoding UTF8 -LiteralPath $Storyboard | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = @($synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name })
if ($voices -contains 'Microsoft Zira Desktop') { $synth.SelectVoice('Microsoft Zira Desktop') }
$synth.Rate = 1
$synth.Volume = 100
foreach ($scene in $story.scenes) {
  $synth.SetOutputToWaveFile((Join-Path $Out ($scene.id + '.wav')), $format)
  $synth.Speak($scene.voice)
  $synth.SetOutputToNull()
  Write-Output ('Narrated ' + $scene.id)
}
$synth.Dispose()
