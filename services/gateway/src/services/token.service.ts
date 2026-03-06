import { db } from "../config/database";
import { redisClient } from "../config/redis";
import { generateServiceToken, hashToken } from "../lib/crypto";

const TOKEN_CACHE_PREFIX = "token:validation:";
const DEFAULT_CACHE_TTL_SECONDS = 60;
const INVALID_CACHE_TTL_SECONDS = 15;

function validationCacheKey(tokenHash: string): string {
  return `${TOKEN_CACHE_PREFIX}${tokenHash}`;
}

function computeTtl(expiresAt?: string | null): number {
  if (!expiresAt) return DEFAULT_CACHE_TTL_SECONDS;
  const diffSeconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  if (diffSeconds <= 0) return 1;
  return Math.min(DEFAULT_CACHE_TTL_SECONDS, diffSeconds);
}

export class TokenService {
  async createToken(input: { orgId?: string; name: string; scopes: string[]; expiresInDays?: number }): Promise<{ token: string; id: string }> {
    const raw = generateServiceToken();
    const tokenHash = hashToken(raw);
    const expiresAt = input.expiresInDays ? `now() + interval '${input.expiresInDays} days'` : null;

    const query = expiresAt
      ? `INSERT INTO tokens_api (org_id, name, token_hash, scopes, expires_at)
         VALUES ($1, $2, $3, $4, ${expiresAt}) RETURNING id`
      : `INSERT INTO tokens_api (org_id, name, token_hash, scopes)
         VALUES ($1, $2, $3, $4) RETURNING id`;

    const values = [input.orgId ?? null, input.name, tokenHash, input.scopes];
    const { rows } = await db.query(query, values);
    return { token: raw, id: rows[0].id };
  }

  async listTokens(orgId?: string): Promise<unknown[]> {
    const { rows } = orgId
      ? await db.query("SELECT id, org_id, name, scopes, is_active, created_at, expires_at, last_used_at FROM tokens_api WHERE org_id = $1 ORDER BY created_at DESC", [orgId])
      : await db.query("SELECT id, org_id, name, scopes, is_active, created_at, expires_at, last_used_at FROM tokens_api ORDER BY created_at DESC");
    return rows;
  }

  async revokeToken(id: string): Promise<void> {
    const { rows } = await db.query(
      "UPDATE tokens_api SET is_active = false WHERE id = $1 RETURNING token_hash",
      [id]
    );
    const tokenHash = rows[0]?.token_hash as string | undefined;
    if (tokenHash) {
      await redisClient.del(validationCacheKey(tokenHash));
    }
  }

  async validateToken(raw: string): Promise<{ valid: boolean; scopes: string[] }> {
    if (!raw) return { valid: false, scopes: [] };
    const tokenHash = hashToken(raw);
    const cacheKey = validationCacheKey(tokenHash);

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as { valid: boolean; scopes: string[] };
    }

    const { rows } = await db.query(
      "SELECT id, scopes, is_active, expires_at FROM tokens_api WHERE token_hash = $1",
      [tokenHash]
    );
    if (!rows.length) {
      const invalidResult = { valid: false, scopes: [] as string[] };
      await redisClient.set(cacheKey, JSON.stringify(invalidResult), { EX: INVALID_CACHE_TTL_SECONDS });
      return invalidResult;
    }

    const token = rows[0];
    const expired = token.expires_at && new Date(token.expires_at) < new Date();
    const result = { valid: Boolean(token.is_active) && !expired, scopes: (token.scopes ?? []) as string[] };

    if (result.valid) {
      await db.query("UPDATE tokens_api SET last_used_at = now() WHERE id = $1", [token.id]);
    }

    await redisClient.set(cacheKey, JSON.stringify(result), {
      EX: result.valid ? computeTtl(token.expires_at as string | null | undefined) : INVALID_CACHE_TTL_SECONDS
    });

    return result;
  }
}
