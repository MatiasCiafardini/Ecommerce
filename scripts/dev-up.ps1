$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $workspaceRoot ".local-runtime"
$logDir = Join-Path $runtimeDir "logs"
$pidDir = Join-Path $runtimeDir "pids"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path $pidDir | Out-Null

function Get-TrackedProcess {
  param([string]$Name)

  $pidFile = Join-Path $pidDir "$Name.pid"
  if (-not (Test-Path $pidFile)) {
    return $null
  }

  $rawPid = (Get-Content $pidFile -Raw).Trim()
  if (-not $rawPid) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    return $null
  }

  $process = Get-Process -Id ([int]$rawPid) -ErrorAction SilentlyContinue
  if (-not $process) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    return $null
  }

  return $process
}

function Get-PortOwner {
  param([int]$Port)

  return Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty OwningProcess
}

function Start-ManagedProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [int]$Port
  )

  $existing = Get-TrackedProcess -Name $Name
  if ($existing) {
    Write-Host "$Name ya esta corriendo con PID $($existing.Id) en puerto $Port."
    return
  }

  $portOwner = Get-PortOwner -Port $Port
  if ($portOwner) {
    Write-Warning "El puerto $Port ya esta ocupado por PID $portOwner. No arranco $Name para evitar conflictos."
    return
  }

  $stdoutLog = Join-Path $logDir "$Name.log"
  $stderrLog = Join-Path $logDir "$Name.error.log"

  $serviceScript = Join-Path $PSScriptRoot "dev-service.ps1"
  $quotedArgs = "-ExecutionPolicy Bypass -File `"$serviceScript`" -WorkingDirectory `"$WorkingDirectory`" -Command `"$Command`""

  $process = Start-Process -FilePath "powershell.exe" `
    -ArgumentList $quotedArgs `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru `
    -WindowStyle Hidden

  Set-Content -Path (Join-Path $pidDir "$Name.pid") -Value $process.Id
  Write-Host "$Name iniciado con PID $($process.Id). Logs: $stdoutLog"
}

Start-ManagedProcess `
  -Name "backend" `
  -WorkingDirectory (Join-Path $workspaceRoot "ecommerce-backend") `
  -Command "npm.cmd run start:dev" `
  -Port 3000

Start-ManagedProcess `
  -Name "store1" `
  -WorkingDirectory (Join-Path $workspaceRoot "ecommerce-storefront") `
  -Command "npm.cmd run dev:store1" `
  -Port 3001

Start-ManagedProcess `
  -Name "store2" `
  -WorkingDirectory (Join-Path $workspaceRoot "ecommerce-storefront") `
  -Command "npm.cmd run dev:store2" `
  -Port 3002

Start-ManagedProcess `
  -Name "store3" `
  -WorkingDirectory (Join-Path $workspaceRoot "ecommerce-storefront") `
  -Command "npm.cmd run dev:store3" `
  -Port 3003

Start-ManagedProcess `
  -Name "store4" `
  -WorkingDirectory (Join-Path $workspaceRoot "ecommerce-storefront") `
  -Command "npm.cmd run dev:store4" `
  -Port 3004

Start-ManagedProcess `
  -Name "store5" `
  -WorkingDirectory (Join-Path $workspaceRoot "ecommerce-storefront") `
  -Command "npm.cmd run dev:store5" `
  -Port 3005

Start-ManagedProcess `
  -Name "store6" `
  -WorkingDirectory (Join-Path $workspaceRoot "ecommerce-storefront") `
  -Command "npm.cmd run dev:store6" `
  -Port 3006

Start-ManagedProcess `
  -Name "store7" `
  -WorkingDirectory (Join-Path $workspaceRoot "ecommerce-storefront") `
  -Command "npm.cmd run dev:store7" `
  -Port 3007

Write-Host ""
Write-Host "URLs locales:"
Write-Host "- Backend: http://localhost:3000/docs"
Write-Host "- Store 1: http://localhost:3001"
Write-Host "- Store 2: http://localhost:3002"
Write-Host "- Store 3: http://localhost:3003"
Write-Host "- Store 4: http://localhost:3004"
Write-Host "- Store 5: http://localhost:3005"
Write-Host "- Store 6: http://localhost:3006"
Write-Host "- Store 7: http://localhost:3007"
Write-Host ""
Write-Host "Para revisar procesos: npm run dev:status"
Write-Host "Para apagarlos: npm run dev:down"
