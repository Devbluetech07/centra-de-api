# Deploy Guide

## Requisitos
- Docker e Docker Compose
- DNS e TLS no ambiente de producao

## Passos
1. Ajuste `.env` com secrets de producao.
2. Execute `docker compose pull` e `docker compose up -d --build`.
3. Configure proxy reverso para `gateway` e `frontend`.
4. Restrinja acesso publico ao MinIO console.

## Observabilidade
- Logs em JSON em todos servicos.
- Endpoint `/health` em cada microsservico.
