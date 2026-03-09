# Valeris KYC - v3.0.0 Estavel
Plataforma de captura KYC com foco em validacao de identidade, captura de assinatura digital e armazenamento seguro de evidencias.
## Stack Principal
- Backend: Go (Gin)
- Frontend Web: HTML/CSS/JavaScript
- Frontend App: Flutter (WebView para embed)
- Banco: PostgreSQL + pgvector
- Storage: MinIO (S3 compatível)
- Orquestracao: Docker Compose
## Funcionalidades
- Captura de `assinatura`, `documento`, `selfie` e `selfie + documento`
- Validacao de qualidade e alinhamento antes de liberar captura
- Upload da imagem composta para MinIO
- Persistencia de metadados de auditoria (IP, geolocalizacao, dispositivo, horario)
- Fila de embeddings com health check dedicado
- Modo embed plug-and-play por URL (`service`, `token`, `apiUrl`)
## Estrutura
- `backend-go`: API, autenticacao, worker de embeddings e integracoes
- `frontend-web`: portal, microsservicos de captura e SDK
- `frontend_flutter`: app Flutter para integracao e uso mobile
- `db`: migrations e bootstrap do banco
- `scripts`: backup, restore e verificacao de saude
## Como subir localmente
1. Ajuste variaveis em `.env` (nao versionar segredos reais).
2. Suba os containers:
```bash
docker compose up -d --build
Acesse:
Portal: http://localhost:3000
API: http://localhost:3001
Endpoints de saude
API: GET /health
Embeddings: GET /health/embeddings
Embed em projeto externo
Use iframe apontando para o index.html com query params:

<iframe
  src="https://SEU_DOMINIO/?service=documento&token=SEU_TOKEN&apiUrl=https://SEU_DOMINIO_API/api"
  allow="camera;microphone;geolocation"
  style="width:100%;height:100vh;border:0;"
></iframe>
Servicos aceitos:

assinatura
documento
selfie
selfie_doc
Seguranca para producao
Trocar JWT_SECRET, credenciais de DB e MinIO
Manter .env fora de versionamento
Habilitar HTTPS obrigatoriamente (camera em mobile e seguranca)
Restringir CORS com FRONTEND_URLS
Usar bucket MinIO privado (MINIO_PUBLIC_BUCKET=false)
