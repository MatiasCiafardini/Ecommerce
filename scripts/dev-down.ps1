$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$pidDir = Join-Path $workspaceRoot ".local-runtime\\pids"
$services = @(
  @{ Name = "backend"; Port = 3000 },
  @{ Name = "store1"; Port = 3001 },
  @{ Name = "store2"; Port = 3002 },
  @{ Name = "store3"; Port = 3003 },
  @{ Name = "store4"; Port = 3004 },
  @{ Name = "store5"; Port = 3005 },
  @{ Name = "store6"; Port = 3006 },
  @{ Name = "store7"; Port = 3007 }
)

function Stop-ProcessTree {
  param(
    [int]$ProcessId,
    [string]$Label
  )

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if (-not $process) {
    Write-Host "$Label ya no estaba corriendo."
    return
  }

  taskkill /PID $ProcessId /T /F | Out-Null
  Write-Host "$Label detenido (PID $ProcessId)."
}

if (-not (Test-Path $pidDir)) {
  Write-Host "No hay procesos administrados guardados. Intento liberar puertos conocidos..."
}

if (Test-Path $pidDir) {
  Get-ChildItem $pidDir -Filter *.pid | ForEach-Object {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
    $rawPid = (Get-Content $_.FullName -Raw).Trim()

    if (-not $rawPid) {
      Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
      return
    }

    Stop-ProcessTree -ProcessId ([int]$rawPid) -Label $name
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
  }
}

foreach ($service in $services) {
  $portOwners = Get-NetTCPConnection -State Listen -LocalPort $service.Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($ownerPid in $portOwners) {
    if ($ownerPid) {
      Stop-ProcessTree -ProcessId ([int]$ownerPid) -Label "$($service.Name) puerto $($service.Port)"
    }
  }
}
