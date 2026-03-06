type ClientConfig = {
  gatewayUrl: string;
  assinaturaUrl: string;
  documentoUrl: string;
  selfieDocumentoUrl: string;
  validatorWsUrl: string;
  serviceKey?: string;
  getServiceKey?: () => string;
};

type TokenPayload = {
  name: string;
  scopes: string[];
};

const jsonHeaders = (serviceKey: string) => ({
  "Content-Type": "application/json",
  "x-service-key": serviceKey
});

export function createBlueTechClient(config: ClientConfig) {
  let serviceKey = config.serviceKey ?? "";
  const resolveServiceKey = () => config.getServiceKey?.() ?? serviceKey;

  const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(url, init);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`BlueTech API error (${res.status}): ${body}`);
    }
    return (await res.json()) as T;
  };

  return {
    validatorWsUrl: config.validatorWsUrl,
    getServiceKey: () => resolveServiceKey(),
    setServiceKey: (next: string) => {
      serviceKey = next;
    },

    createToken: (payload: TokenPayload) =>
      request(`${config.gatewayUrl}/api/v1/tokens`, {
        method: "POST",
        headers: jsonHeaders(resolveServiceKey()),
        body: JSON.stringify(payload)
      }),

    bootstrapTestIds: () =>
      request<{
        data: { orgId?: string; documentId: string; signatoryId: string };
      }>(`${config.gatewayUrl}/api/v1/dev/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      }),

    saveSignatureDrawn: (payload: { signerId: string; documentId: string; imageBase64: string }) =>
      request(`${config.assinaturaUrl}/api/v1/assinatura/desenho`, {
        method: "POST",
        headers: jsonHeaders(resolveServiceKey()),
        body: JSON.stringify(payload)
      }),

    saveSignatureTyped: (payload: { signerId: string; documentId: string; fullName: string; fontFamily?: string }) =>
      request(`${config.assinaturaUrl}/api/v1/assinatura/tipografica`, {
        method: "POST",
        headers: jsonHeaders(resolveServiceKey()),
        body: JSON.stringify(payload)
      }),

    uploadDocument: (payload: { signerId: string; documentId: string; type: string; side: string; imageBase64: string }) =>
      request(`${config.documentoUrl}/api/v1/documento/upload`, {
        method: "POST",
        headers: jsonHeaders(resolveServiceKey()),
        body: JSON.stringify(payload)
      }),

    uploadSelfieDocument: (payload: { signerId: string; documentId: string; imageBase64: string }) =>
      request(`${config.selfieDocumentoUrl}/api/v1/selfie-documento/capturar`, {
        method: "POST",
        headers: jsonHeaders(resolveServiceKey()),
        body: JSON.stringify(payload)
      })
  };
}
