$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$reactSource = Join-Path $root "integration-kit/react"
$pythonSource = Join-Path $root "integration-kit/python-validator"
$dist = Join-Path $root "dist"
$frontendDownloads = Join-Path $root "frontend/public/downloads"
$reactZipPath = Join-Path $dist "bluetech-sign-react-kit.zip"
$fullTemp = Join-Path $dist "bluetech-sign-integration-kit"
$fullZipPath = Join-Path $dist "bluetech-sign-integration-full.zip"

if (!(Test-Path $reactSource)) {
  throw "React source not found: $reactSource"
}

if (!(Test-Path $pythonSource)) {
  throw "Python source not found: $pythonSource"
}

New-Item -ItemType Directory -Path $dist -Force | Out-Null
if (Test-Path $reactZipPath) {
  Remove-Item $reactZipPath -Force
}
if (Test-Path $fullTemp) {
  Remove-Item $fullTemp -Recurse -Force
}
if (Test-Path $fullZipPath) {
  Remove-Item $fullZipPath -Force
}

Compress-Archive -Path (Join-Path $reactSource "*") -DestinationPath $reactZipPath

New-Item -ItemType Directory -Path $fullTemp -Force | Out-Null
Copy-Item $reactSource (Join-Path $fullTemp "react-kit") -Recurse -Force
Copy-Item $pythonSource (Join-Path $fullTemp "python-validator-kit") -Recurse -Force

Compress-Archive -Path (Join-Path $fullTemp "*") -DestinationPath $fullZipPath
try {
  Remove-Item $fullTemp -Recurse -Force
} catch {
  Write-Warning "Nao foi possivel limpar pasta temporaria agora: $fullTemp"
}

Write-Host "Generated: $reactZipPath"
Write-Host "Generated: $fullZipPath"

New-Item -ItemType Directory -Path $frontendDownloads -Force | Out-Null
Copy-Item $reactZipPath (Join-Path $frontendDownloads "bluetech-sign-react-kit.zip") -Force
Copy-Item $fullZipPath (Join-Path $frontendDownloads "bluetech-sign-integration-full.zip") -Force
$tgzPath = Join-Path $reactSource "bluetech-sign-react-kit-0.1.0.tgz"
if (Test-Path $tgzPath) {
  Copy-Item $tgzPath (Join-Path $frontendDownloads "bluetech-sign-react-kit-0.1.0.tgz") -Force
}
Write-Host "Synced downloads to: $frontendDownloads"
