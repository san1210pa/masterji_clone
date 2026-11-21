$ErrorActionPreference = 'Stop'

$mongoServerRoot = Join-Path $env:ProgramFiles 'MongoDB\Server'
if (-not (Test-Path $mongoServerRoot)) {
  throw "MongoDB Server was not found under $mongoServerRoot. Install MongoDB Community Server first."
}

$mongoBinary = Get-ChildItem -LiteralPath $mongoServerRoot -Directory |
  Sort-Object Name -Descending |
  ForEach-Object { Join-Path $_.FullName 'bin\mongod.exe' } |
  Where-Object { Test-Path -LiteralPath $_ } |
  Select-Object -First 1

if (-not $mongoBinary) {
  throw 'mongod.exe was not found in the MongoDB Server installation.'
}

$mongoDataPath = Join-Path $PSScriptRoot '.mongo-data'
New-Item -ItemType Directory -Force -Path $mongoDataPath | Out-Null
Write-Host "Starting local MongoDB with data in $mongoDataPath. Press Ctrl+C to stop it."
& $mongoBinary --dbpath $mongoDataPath --bind_ip 127.0.0.1 --port 27017
