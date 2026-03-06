import { config } from "dotenv";
import { z } from "zod";

config();

const schema = z.object({
  DATABASE_URL: z.string(),
  PG_POOL_MAX: z.coerce.number().int().positive().default(20),
  PG_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  PG_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  PG_SSL_MODE: z.enum(["disable", "require"]).default("disable"),
  MINIO_ENDPOINT: z.string().default("minio"),
  MINIO_PORT: z.string().default("9000"),
  MINIO_USE_SSL: z.string().default("false"),
  MINIO_ROOT_USER: z.string(),
  MINIO_ROOT_PASSWORD: z.string(),
  BUCKET_SELFIES: z.string().default("bluetech-sign"),
  SELFIES_PREFIX: z.string().default("selfie_documento"),
  VALIDATOR_URL: z.string().default("http://ms-validator:8000"),
  REVERSE_GEOCODE_ENABLED: z.string().default("true"),
  REVERSE_GEOCODE_URL: z.string().default("https://nominatim.openstreetmap.org/reverse"),
  REVERSE_GEOCODE_USER_AGENT: z.string().default("BlueTechSign/1.0"),
  IP_GEOLOOKUP_ENABLED: z.string().default("true"),
  IP_GEOLOOKUP_URL_TEMPLATE: z.string().default("http://ip-api.com/json/{ip}?fields=status,message,country,regionName,city,lat,lon,query"),
  PUBLIC_IP_LOOKUP_URL: z.string().default("https://api.ipify.org?format=json"),
  GATEWAY_URL: z.string().default("http://gateway:3000"),
  HMAC_SHARED_SECRET: z.string().default(""),
  REQUIRE_HMAC: z.string().default("false"),
  PORT: z.string().default("3004")
});

export const env = schema.parse(process.env);
