$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)]
  [string]$TargetProjectPath,

  [ValidateSet("react", "full")]
  [string]$Mode = "react"
)

$root = Split-Path -Parent $PSScriptRoot
$reactSource = Join-Path $root "integration-kit/react/src"
$pythonSource = Join-Path $root "integration-kit/python-validator"
$targetRoot = (Resolve-Path $TargetProjectPath).Path
$targetReact = Join-Path $targetRoot "src/bluetech-sign"
$targetPython = Join-Path $targetRoot "bluetech-python-validator"

if (!(Test-Path $reactSource)) {
  throw "React source not found: $reactSource"
}

New-Item -ItemType Directory -Path $targetReact -Force | Out-Null
Copy-Item (Join-Path $reactSource "*") $targetReact -Recurse -Force
Write-Host "React kit installed at: $targetReact"

if ($Mode -eq "full") {
  if (!(Test-Path $pythonSource)) {
    throw "Python validator source not found: $pythonSource"
  }
  New-Item -ItemType Directory -Path $targetPython -Force | Out-Null
  Copy-Item (Join-Path $pythonSource "*") $targetPython -Recurse -Force
  Write-Host "Python validator kit installed at: $targetPython"
}

Write-Host "Done. Import from: src/bluetech-sign"
