# BlueTech Python Recognition Kit

Pacote Python para validacao de reconhecimento em tempo real (documento, selfie+documento e face).

## Conteudo
- FastAPI + WebSocket
- OpenCV (detecao de face/documento e qualidade)
- Endpoints HTTP e WS compativeis com o frontend/integration kit

## Rodar com Docker
```bash
docker build -t bluetech-python-validator .
docker run --rm -p 8000:8000 bluetech-python-validator
```

## Endpoints
- `GET /health`
- `POST /api/v1/validate/document`
- `POST /api/v1/validate/selfie-document`
- `POST /api/v1/validate/face`
- `WS /ws/validate-document`
- `WS /ws/validate-selfie-document`
- `WS /ws/validate-face`

## Integracao com React Kit
Use `validatorWsUrl` apontando para este servico, por exemplo:
- local: `ws://localhost:8000`

## Observacao
Este kit nao depende de API externa para reconhecimento basico.
