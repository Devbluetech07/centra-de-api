# Microsservices Architecture

## Servicos Node
- `gateway`: token, docs, rate limit e autenticação por `x-service-key`
- `ms-assinatura`: captura de assinatura
- `ms-documento`: captura de documento e validação via `ms-validator`
- `ms-selfie-documento`: captura selfie+documento e validação via `ms-validator`

## Servico Python
- `ms-validator`: validação de qualidade de imagem, detecção de rosto e documento

## Storage e dados
- PostgreSQL + pgvector para dados transacionais e embeddings
- MinIO para objetos de captura
