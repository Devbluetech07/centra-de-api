# BlueTech Sign Microservices

Arquitetura inicial de producao para a Central de API com microsservicos independentes.

## Servicos
- gateway (Express + TypeScript)
- ms-assinatura
- ms-documento
- ms-selfie-documento
- ms-validator (FastAPI)
- postgres (pgvector)
- minio
- redis
- frontend (React + Vite)

## Como subir
1. Copie `.env.example` para `.env` e ajuste segredos.
2. Rode `docker compose up --build`.
3. MinIO console: http://localhost:9001
4. Frontend: http://localhost:5173
5. Gateway: http://localhost:3000/health
