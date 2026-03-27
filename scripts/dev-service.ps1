param(
  [Parameter(Mandatory = $true)]
  [string]$WorkingDirectory,

  [Parameter(Mandatory = $true)]
  [string]$Command
)

$ErrorActionPreference = "Stop"
Set-Location $WorkingDirectory

& cmd.exe /c $Command
