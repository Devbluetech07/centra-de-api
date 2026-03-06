$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)]
  [string]$Sql,

  [int]$IntervalSeconds = 3,

  [string]$ContainerName = "central-de-api-postgres-1",
  [string]$DbUser = "postgres",
  [string]$DbName = "bluetech_sign"
)

if ($IntervalSeconds -lt 1) {
  throw "IntervalSeconds deve ser >= 1"
}

Write-Host "Monitorando consulta no PostgreSQL a cada $IntervalSeconds segundo(s)." -ForegroundColor Cyan
Write-Host "Pressione CTRL + C para parar.`n" -ForegroundColor Yellow

while ($true) {
  Clear-Host
  Write-Host ("Hora: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")) -ForegroundColor Green
  Write-Host ("SQL: " + $Sql) -ForegroundColor DarkCyan
  Write-Host ""

  docker exec $ContainerName psql -U $DbUser -d $DbName -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao executar query no container $ContainerName"
  }

  Start-Sleep -Seconds $IntervalSeconds
}
