$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$pidDir = Join-Path $workspaceRoot ".local-runtime\\pids"
$services = @(
  @{ Name = "backend"; Port = 3000; Url = "http://localhost:3000/docs" },
  @{ Name = "store1"; Port = 3001; Url = "http://localhost:3001" },
  @{ Name = "store2"; Port = 3002; Url = "http://localhost:3002" },
  @{ Name = "store3"; Port = 3003; Url = "http://localhost:3003" },
  @{ Name = "store4"; Port = 3004; Url = "http://localhost:3004" },
  @{ Name = "store5"; Port = 3005; Url = "http://localhost:3005" },
  @{ Name = "store6"; Port = 3006; Url = "http://localhost:3006" }
)

foreach ($service in $services) {
  $pidFile = Join-Path $pidDir "$($service.Name).pid"
  $trackedPid = $null
  $process = $null

  if (Test-Path $pidFile) {
    $rawPid = (Get-Content $pidFile -Raw).Trim()
    if ($rawPid) {
      $trackedPid = [int]$rawPid
      $process = Get-Process -Id $trackedPid -ErrorAction SilentlyContinue
    }
  }

  $portOwner = Get-NetTCPConnection -State Listen -LocalPort $service.Port -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty OwningProcess

  if ($portOwner) {
    $portOwnerProcess = Get-Process -Id $portOwner -ErrorAction SilentlyContinue
    if (-not $portOwnerProcess) {
      $portOwner = $null
    }
  }

  if ($process) {
    Write-Host "$($service.Name): activo | PID $($process.Id) | puerto $($service.Port) | $($service.Url)"
  } elseif ($portOwner) {
    Write-Host "$($service.Name): puerto ocupado por PID $portOwner | puerto $($service.Port) | $($service.Url)"
  } else {
    Write-Host "$($service.Name): detenido | puerto $($service.Port) | $($service.Url)"
  }
}
