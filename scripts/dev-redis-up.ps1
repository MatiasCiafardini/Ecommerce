$ErrorActionPreference = "Stop"

$containerName = "ecommerce-local-redis"
$redisPort = 6379

function Get-PortOwner {
  param([int]$Port)

  return Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty OwningProcess
}

if (Get-PortOwner -Port $redisPort) {
  Write-Host "Redis/local port $redisPort ya esta disponible."
  return
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  Write-Warning "Docker no esta instalado o no esta en PATH. Redis local no se inicio."
  return
}

$dockerReady = $false
try {
  docker info *> $null
  $dockerReady = $true
} catch {
  $dockerReady = $false
}

if (-not $dockerReady) {
  Write-Warning "Docker no esta corriendo. Abri Docker Desktop y ejecuta npm run dev:redis:up para iniciar Redis."
  return
}

$existing = docker ps -a --filter "name=^/$containerName$" --format "{{.Names}}"
if ($existing -eq $containerName) {
  docker start $containerName *> $null
  Write-Host "Redis local iniciado desde contenedor existente $containerName."
  return
}

docker run -d --name $containerName -p "$redisPort:6379" redis:7-alpine *> $null
Write-Host "Redis local iniciado en puerto $redisPort."
