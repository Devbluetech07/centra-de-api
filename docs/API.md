# API Overview

## Fluxo recomendado
1. Criar token com escopos no `gateway`.
2. Validar token em `POST /api/v1/tokens/validate`.
3. Gerar IDs de teste em `POST /api/v1/dev/bootstrap`.
4. Enviar captura para os microserviços usando `x-service-key`.

## Gateway
- `GET /health`
- `GET /api/v1/docs`
- `POST /api/v1/tokens`
- `GET /api/v1/tokens`
- `DELETE /api/v1/tokens/:id`
- `POST /api/v1/tokens/validate`
- `POST /api/v1/dev/bootstrap` (somente `development`) para gerar `orgId`, `documentId`, `signatoryId`
- `POST /api/v1/integrations/bluepoint/verificar-face` (proxy server-to-server para BluePoint)

## Microserviços de captura
- `POST /api/v1/assinatura/desenho`
- `POST /api/v1/assinatura/tipografica`
- `POST /api/v1/documento/upload`
- `POST /api/v1/selfie-documento/capturar`

## Validator Python (reconhecimento)
- `GET /health`
- `POST /api/v1/validate/document`
- `POST /api/v1/validate/selfie-document`
- `POST /api/v1/validate/face`
- `WS /ws/validate-document`
- `WS /ws/validate-selfie-document`
- `WS /ws/validate-face`

## Segurança
- Header obrigatório para captura: `x-service-key`.
- Escopos por rota (ex.: `assinatura:create`, `documento:upload`, `selfie-documento:capture`).
- HMAC opcional: `x-payload-signature` quando `REQUIRE_HMAC=true`.

## Banco de dados (PostgreSQL + pgvector)
- Tabelas operacionais no padrao PT-BR: `organizacoes`, `documentos`, `signatarios`, `assinaturas`, `documentos_signatario`, `selfies_documentos`, `tokens_api`, `logs_auditoria`.
- Para observar dados durante testes:
  - Adminer: `http://localhost:8080`
  - Query terminal: `docker exec central-de-api-postgres-1 psql -U postgres -d bluetech_sign -c "SELECT * FROM tokens_api ORDER BY created_at DESC LIMIT 20;"`

## Downloads para integração
- UI local para download: `http://localhost:5173` na aba `DOCS`.
- Pacote React (zip): `http://localhost:5173/downloads/bluetech-sign-react-kit.zip`
- Pacote completo React + Python (zip): `http://localhost:5173/downloads/bluetech-sign-integration-full.zip`
- Pacote npm local (.tgz): `http://localhost:5173/downloads/bluetech-sign-react-kit-0.1.0.tgz`
- Instalacao automatizada (copy para pasta do cliente):
  - `powershell -ExecutionPolicy Bypass -File scripts/install-integration-kit.ps1 -TargetProjectPath "C:\meu-projeto" -Mode react`
  - `powershell -ExecutionPolicy Bypass -File scripts/install-integration-kit.ps1 -TargetProjectPath "C:\meu-projeto" -Mode full`

## BluePoint (selfie)
- Documentacao oficial: `https://bluepoint-api.bluetechfilms.com.br/docs/biometria`
- Endpoint usado no app: `POST /api/v1/biometria/verificar-face`
- Payload enviado:
  - `{ "imagem": "data:image/jpeg;base64,..." }`
- Header de autenticacao:
  - `Authorization: Bearer SEU_TOKEN_JWT_OU_API_KEY`
