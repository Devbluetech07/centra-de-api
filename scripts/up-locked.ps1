Param(
    [switch]$Build
)

$ErrorActionPreference = "Stop"

$projectName = "central-de-api"
$requiredPorts = @(3000, 3001, 5432, 29000, 29001, 5050)

Write-Host "=> Derrubando stack anterior ($projectName) e removendo orfaos..."
docker compose -p $projectName down --remove-orphans | Out-Host

Write-Host "=> Verificando portas obrigatorias..."
$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in $requiredPorts }

if ($listeners) {
    Write-Host "Portas em uso detectadas. Finalize os processos abaixo e rode novamente:" -ForegroundColor Red
    $listeners |
        Select-Object LocalAddress, LocalPort, OwningProcess |
        Sort-Object LocalPort |
        Format-Table -AutoSize | Out-Host
    exit 1
}

$env:COMPOSE_PROJECT_NAME = $projectName
$env:MINIO_ENDPOINT = "minio:9000"

$upArgs = @("compose", "-p", $projectName, "up", "-d", "--remove-orphans")
if ($Build) { $upArgs += "--build" }

Write-Host "=> Subindo stack travada ($projectName)..."
docker @upArgs | Out-Host

Write-Host "=> Status atual:"
docker compose -p $projectName ps | Out-Host
