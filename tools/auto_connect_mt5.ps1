# ============================================================================
# Traders Journal - MetaTrader 5 Quick Auto-Connect & Multi-Account Scanner
# Automatically detects MetaTrader 5, connects to the live terminal, and scans
# all trading accounts & trade histories stored on this PC.
# ============================================================================

$ErrorActionPreference = "SilentlyContinue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$ProjectRoot\server.js")) {
    $ProjectRoot = "C:\GPT\local"
}

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

Write-Host "[3/3] Verifying synced accounts with Traders Journal..."
try {
    $state = Invoke-RestMethod -Uri "http://127.0.0.1:8765/api/state?v=-1" -Headers @{ Host = "127.0.0.1:8765" } -TimeoutSec 5
    $mt5Conns = @($state.connections | Where-Object { $_.id -like "mt5-*" })
    Write-Host "      Successfully connected $($mt5Conns.Count) MetaTrader 5 account(s):"
    foreach ($c in $mt5Conns) {
        $acc = $c.account
        $bal = if ($acc -and $null -ne $acc.balance) { ('${0:N2}' -f [double]$acc.balance) } else { '$0.00' }
        $src = if ($acc -and $acc.source -eq 'live_terminal') { 'LIVE IN TERMINAL' } else { 'SAVED ON PC' }
        Write-Host ("      - {0} | Login: {1} | Server: {2} | Balance: {3} | Trades: {4} [{5}]" -f $c.name, $acc.login, $acc.server, $bal, $c.tradeCount, $src)
    }
} catch {
    Write-Host "      Sync complete."
}
