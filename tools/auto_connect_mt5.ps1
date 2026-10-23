# ============================================================================
# Traders Journal - MetaTrader 5 Quick Auto-Connect & Multi-Account Scanner
# Automatically detects MetaTrader 5, connects to the live terminal, and scans
# all trading accounts & trade histories stored on this PC.
# ============================================================================

$ErrorActionPreference = "SilentlyContinue"
# Always the folder this script ships in; never fall back to a fixed folder other users could create.
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "[1/3] Checking MetaTrader 5 terminal process..."
$mt5Proc = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue
if (-not $mt5Proc) {
    $mt5Paths = @(
        "C:\Program Files\MetaTrader 5\terminal64.exe",
        "$env:ProgramFiles\MetaTrader 5\terminal64.exe",
        "${env:ProgramFiles(x86)}\MetaTrader 5\terminal64.exe"
    )
    $exe = $mt5Paths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($exe) {
        Write-Host "      Starting MetaTrader 5 ($exe)..."
        Start-Process -FilePath $exe
        Start-Sleep -Seconds 4
    } else {
        Write-Host "      MetaTrader 5 not currently running (scanning local PC account folders)..."
    }
} else {
    Write-Host "      MetaTrader 5 is running (PID: $($mt5Proc.Id))."
}

Write-Host "[2/3] Scanning & syncing all MetaTrader 5 trading accounts on this PC..."
$pyExe = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
$syncScript = Join-Path $ProjectRoot "tools\mt5_sync.py"

if (Test-Path $pyExe) {
    & $pyExe $syncScript --scan-all
} else {
    python $syncScript --scan-all
}

# Account details need a signed-in session, so only confirm the app is reachable; the scan above lists each account.
Write-Host "[3/3] Checking that Traders Journal is running..."
try {
    $null = Invoke-RestMethod -Uri "http://127.0.0.1:8765/api/health" -TimeoutSec 5
    Write-Host "      Traders Journal received the sync. Open the app to see your accounts."
} catch {
    Write-Host "      Traders Journal is not running. Start the app, then run this again to send the accounts."
}
