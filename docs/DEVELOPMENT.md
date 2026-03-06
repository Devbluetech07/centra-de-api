# Development Guide

- Stack: Node.js + TypeScript + Express, FastAPI, PostgreSQL + pgvector, MinIO.
- Start: `docker compose up --build`.
- Buckets are initialized by `minio-init` service.
- Use `.env` based on `.env.example` for local secrets.
- Capture services require `x-service-key` with valid scope per endpoint.
- Optional payload hardening: set `REQUIRE_HMAC=true` and send `x-payload-signature` (HMAC SHA-256 do JSON body).
- Token validation in `gateway` uses Redis cache with short TTL and immediate invalidation on revoke.
- Capture services also keep a local in-memory cache (10s TTL) for token validation results to reduce repeated gateway calls.
- Reuse package for integrators: `integration-kit/react` (copy `src` into host app or export ZIP with `scripts/export-integration-kit.ps1`).
- Python recognition scripts for integrators: `integration-kit/python-validator` (included in `dist/bluetech-sign-integration-full.zip`).
- Frontend local inclui validacao de token por botao `VALIDAR TOKEN` e mensagem `Conectado com sucesso`.
- Fluxo de documento no frontend e guiado por etapas: selecionar tipo -> frente -> verso (quando aplicavel) -> finalizar.
- Aba `DOCS` do frontend oferece downloads diretos dos kits para incorporacao em outros projetos.
- Selfie integra com BluePoint via proxy no gateway (`POST /api/v1/integrations/bluepoint/verificar-face`) para evitar bloqueio de CORS no browser.
- Layout do frontend foi ajustado com breakpoints para melhor uso em celular (tabs com rolagem horizontal e botoes full width).
- Instalacao automatica em projeto cliente: `powershell -ExecutionPolicy Bypass -File scripts/install-integration-kit.ps1 -TargetProjectPath "C:\meu-projeto" -Mode full`.

## Acompanhar banco em tempo real

- Painel web do banco: `http://localhost:8080` (Adminer).
- Login no Adminer:
  - System: `PostgreSQL`
  - Server: `postgres`
  - Username: `postgres`
  - Password: `postgres` (ou o valor do seu `.env`)
  - Database: `bluetech_sign`
- Query direta no terminal:
  - `docker exec central-de-api-postgres-1 psql -U postgres -d bluetech_sign -c "SELECT COUNT(*) FROM tokens_api;"`
- Monitorar query em loop (auto-refresh):
  - `powershell -ExecutionPolicy Bypass -File scripts/db-watch-select.ps1 -Sql "SELECT now(), COUNT(*) FROM assinaturas;"`

## MinIO com bucket principal + pasta de assinaturas

- Para usar um bucket unico (ex.: `bluetech-sign`) e salvar assinaturas em pasta interna:
  - `BUCKET_ASSINATURAS=bluetech-sign`
  - `ASSINATURAS_PREFIX=assinaturas`
- Resultado dos arquivos no MinIO:
  - `assinaturas/YYYY/MM/DD/{documentId}/{signatoryId}/assinatura_*.png`
