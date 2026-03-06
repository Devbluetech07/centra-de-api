export type Scope =
  | "assinatura:create"
  | "assinatura:read"
  | "assinatura:list"
  | "assinatura:delete"
  | "documento:upload"
  | "documento:validate"
  | "documento:read"
  | "documento:list"
  | "documento:delete"
  | "selfie-documento:capture"
  | "selfie-documento:read"
  | "selfie-documento:list"
  | "selfie-documento:delete";

export interface CaptureMeta {
  ip?: string;
  latitude?: number;
  longitude?: number;
  userAgent?: string;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const DEFAULT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-service-key, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};
