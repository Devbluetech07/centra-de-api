import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  GATEWAY_PORT: z.string().default("3000"),
  DATABASE_URL: z.string(),
  PG_POOL_MAX: z.coerce.number().int().positive().default(20),
  PG_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  PG_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  PG_SSL_MODE: z.enum(["disable", "require"]).default("disable"),
  REDIS_URL: z.string().default("redis://redis:6379"),
  NODE_ENV: z.string().default("development")
});

export const env = envSchema.parse(process.env);
