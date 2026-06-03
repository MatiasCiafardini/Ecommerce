$ErrorActionPreference = "Stop"

$containerName = "ecommerce-local-redis"
$docker = Get-Command docker -ErrorAction SilentlyContinue

if (-not $docker) {
  Write-Host "Docker no esta disponible; no hay Redis Docker que detener."
  return
}

try {
  docker info *> $null
} catch {
  Write-Host "Docker no esta corriendo; no hay Redis Docker que detener."
  return
}

$running = docker ps --filter "name=^/$containerName$" --format "{{.Names}}"
if ($running -eq $containerName) {
  docker stop $containerName *> $null
  Write-Host "Redis local detenido."
  return
}

Write-Host "Redis local no estaba corriendo."
