# BlueTech Sign Integration Kit (React)

Kit para incorporar telas padronizadas da BlueTech Sign em qualquer projeto React + TypeScript.

## O que vem pronto
- `SignaturePad`: assinatura desenhada na tela (canvas)
- `DocumentCapture`: captura/anexo de documento com validacao em tempo real
- `SelfieDocumentCapture`: captura/anexo selfie + documento com validacao em tempo real
- `SetupWizard`: onboarding guiado para token, service key, IDs e health check
- `StarterIntegrationPage`: tela completa pronta para uso (onboarding + envio para API)
- `createBlueTechClient`: cliente de API com `x-service-key`

## Como usar (pacote npm)
1. Instale no projeto host:
   - `npm i @bluetech/sign-react-kit`
2. Configure cliente:

```ts
import { createBlueTechClient } from "@bluetech/sign-react-kit";

export const btClient = createBlueTechClient({
  gatewayUrl: "https://api.seu-dominio.com",
  assinaturaUrl: "https://api.seu-dominio.com:3001",
  documentoUrl: "https://api.seu-dominio.com:3002",
  selfieDocumentoUrl: "https://api.seu-dominio.com:3004",
  validatorWsUrl: "wss://api.seu-dominio.com:8000",
  serviceKey: "bt_live_xxxxx"
});
```

3. Use os componentes no seu app e envie para a API com o cliente.

## Exemplo rapido
```tsx
<SignaturePad onChange={(base64) => setAssinatura(base64)} />
<DocumentCapture
  validatorWsUrl={btClient.validatorWsUrl}
  type="rg"
  side="front"
  onCapture={(base64) => setDocumento(base64)}
/>
```

## Exemplo de onboarding guiado
```tsx
import { SetupWizard } from "@bluetech/sign-react-kit";

<SetupWizard
  serviceKey={serviceKey}
  ids={ids}
  onServiceKeyChange={setServiceKey}
  onIdsChange={setIds}
  onGenerateToken={async ({ name, scopes }) => {
    const response = await btClient.createToken({ name, scopes });
    return { token: response.data?.token };
  }}
  onGenerateTestIds={async () => {
    const response = await fetch("http://localhost:3000/api/v1/dev/bootstrap", { method: "POST" });
    const body = await response.json();
    return {
      orgId: body.data.orgId,
      signerId: body.data.signatoryId,
      documentId: body.data.documentId
    };
  }}
  onCheckHealth={async () => {
    const response = await fetch("http://localhost:3000/health");
    return response.ok;
  }}
/>
```

## Template pronto (1 componente)
```tsx
import { StarterIntegrationPage } from "@bluetech/sign-react-kit";

<StarterIntegrationPage
  gatewayUrl="http://localhost:3000"
  assinaturaUrl="http://localhost:3001"
  documentoUrl="http://localhost:3002"
  selfieDocumentoUrl="http://localhost:3004"
  validatorWsUrl="ws://localhost:8000"
/>
```

Esse componente ja entrega:
- setup de token/ids/health
- assinatura desenhada e tipografica
- captura de documento com validacao
- captura selfie+documento com validacao
- envio para as rotas padrao da API

## Contratos de payload (padrao)
- Assinatura desenho: `{ signerId, documentId, imageBase64 }`
- Assinatura tipografica: `{ signerId, documentId, fullName, fontFamily? }`
- Documento: `{ signerId, documentId, type, side, imageBase64 }`
- Selfie + documento: `{ signerId, documentId, imageBase64 }`

As rotas utilizadas por padrao no cliente sao:
- `POST /api/v1/tokens`
- `POST /api/v1/assinatura/desenho`
- `POST /api/v1/assinatura/tipografica`
- `POST /api/v1/documento/upload`
- `POST /api/v1/selfie-documento/capturar`

## Exportar ZIP para clientes
- Execute: `powershell -ExecutionPolicy Bypass -File scripts/export-integration-kit.ps1`
- Arquivo gerado: `dist/bluetech-sign-react-kit.zip`
- Pacote completo (React + Python reconhecimento): `dist/bluetech-sign-integration-full.zip`

## Scripts Python de reconhecimento (junto da integracao)
- Disponivel em `integration-kit/python-validator`
- Inclui FastAPI + OpenCV + WebSocket para:
  - validacao de documento
  - validacao de selfie+documento
  - validacao de face

## Gerar pacote instalavel (.tgz)
- Build + pacote local: `npm pack` dentro de `integration-kit/react`
- O arquivo gerado pode ser instalado com:
  - `npm i ./bluetech-sign-react-kit-0.1.0.tgz`
