import axios from "axios";

const gatewayBaseUrl = import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:23000";
const documentoBaseUrl = import.meta.env.VITE_DOCUMENTO_URL ?? "http://localhost:23002";
const selfieDocBaseUrl = import.meta.env.VITE_SELFIE_DOCUMENTO_URL ?? "http://localhost:23004";
const assinaturaBaseUrl = import.meta.env.VITE_ASSINATURA_URL ?? "http://localhost:23001";
const validatorBaseUrl = import.meta.env.VITE_VALIDATOR_URL ?? "http://localhost:28000";

const gateway = axios.create({ baseURL: gatewayBaseUrl });
const documentoApi = axios.create({ baseURL: documentoBaseUrl });
const selfieDocApi = axios.create({ baseURL: selfieDocBaseUrl });
const assinaturaApi = axios.create({ baseURL: assinaturaBaseUrl });

const protectedClients = [documentoApi, selfieDocApi, assinaturaApi];
for (const client of protectedClients) {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("serviceKey") ?? "";
    if (token) {
      config.headers["x-service-key"] = token;
    }
    return config;
  });
}

export function setServiceKey(token: string): void {
  localStorage.setItem("serviceKey", token);
}

export function getServiceKey(): string {
  return localStorage.getItem("serviceKey") ?? "";
}

export async function createToken(name: string, scopes: string[], expiresInDays?: number) {
  const payload = expiresInDays ? { name, scopes, expiresInDays } : { name, scopes };
  const { data } = await gateway.post("/api/v1/tokens", payload);
  return data;
}

export async function listTokens() {
  const { data } = await gateway.get("/api/v1/tokens");
  return data;
}

export async function validateServiceKey(token: string) {
  const { data } = await gateway.post("/api/v1/tokens/validate", { token });
  return data;
}

export async function revokeToken(id: string) {
  const { data } = await gateway.delete(`/api/v1/tokens/${id}`);
  return data;
}

export async function revokeAllTokens(ids: string[]) {
  await Promise.all(ids.map((id) => gateway.delete(`/api/v1/tokens/${id}`)));
}

export async function bootstrapTestIds() {
  const { data } = await gateway.post("/api/v1/dev/bootstrap", {});
  return data;
}

export async function fetchGatewayDocs() {
  const { data } = await gateway.get("/api/v1/docs");
  return data;
}

export async function fetchServiceHealth() {
  const [gatewayHealth, assinaturaHealth, documentoHealth, selfieDocHealth, validatorHealth] = await Promise.all([
    gateway.get("/health"),
    assinaturaApi.get("/health"),
    documentoApi.get("/health"),
    selfieDocApi.get("/health"),
    axios.get(`${validatorBaseUrl}/health`)
  ]);

  return {
    gateway: gatewayHealth.data,
    assinatura: assinaturaHealth.data,
    documento: documentoHealth.data,
    selfieDoc: selfieDocHealth.data,
    validator: validatorHealth.data
  };
}

export async function uploadDocumento(payload: unknown) {
  const { data } = await documentoApi.post("/api/v1/documento/upload", payload);
  return data;
}

export async function uploadDocumentoCombinado(payload: unknown) {
  const { data } = await documentoApi.post("/api/v1/documento/upload-completo", payload);
  return data;
}

export async function capturarSelfieDocumento(payload: unknown) {
  const { data } = await selfieDocApi.post("/api/v1/selfie-documento/capturar", payload);
  return data;
}

export async function salvarAssinatura(payload: unknown) {
  const { data } = await assinaturaApi.post("/api/v1/assinatura/desenho", payload);
  return data;
}

export async function salvarAssinaturaTipografica(payload: unknown) {
  const { data } = await assinaturaApi.post("/api/v1/assinatura/tipografica", payload);
  return data;
}

export async function testExternalApiConnection(url: string, token: string) {
  const normalizedUrl = url.trim().replace(/\/+$/, "");
  const headers: Record<string, string> = {};
  if (token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
    headers["x-api-key"] = token.trim();
  }

  const response = await fetch(normalizedUrl, { method: "GET", headers });
  return { ok: response.ok, status: response.status };
}

export async function verifyBluepointFace(payload: { token: string; imagem: string; baseUrl?: string }) {
  const { data } = await gateway.post("/api/v1/integrations/bluepoint/verificar-face", payload);
  return data;
}
