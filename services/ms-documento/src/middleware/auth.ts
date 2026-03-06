import axios from "axios";
import { createHmac, timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";
import { env } from "../env";

const LOCAL_TOKEN_CACHE_TTL_MS = 10_000;

type TokenValidationResult = {
  valid: boolean;
  scopes: string[];
};

type LocalTokenCacheEntry = {
  expiresAt: number;
  result: TokenValidationResult;
};

const localTokenCache = new Map<string, LocalTokenCacheEntry>();

function safeCompare(a: string, b: string): boolean {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function getCachedTokenValidation(token: string): TokenValidationResult | null {
  const entry = localTokenCache.get(token);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    localTokenCache.delete(token);
    return null;
  }
  return entry.result;
}

function cacheTokenValidation(token: string, result: TokenValidationResult): void {
  localTokenCache.set(token, {
    expiresAt: Date.now() + LOCAL_TOKEN_CACHE_TTL_MS,
    result
  });
}

export function requireHmac(req: Request, res: Response, next: NextFunction): void {
  if (env.REQUIRE_HMAC !== "true") {
    next();
    return;
  }

  const signature = req.header("x-payload-signature") ?? req.header("x-signature");
  if (!signature || !env.HMAC_SHARED_SECRET) {
    res.status(401).json({ success: false, error: "missing HMAC signature" });
    return;
  }

  const digest = createHmac("sha256", env.HMAC_SHARED_SECRET).update(JSON.stringify(req.body ?? {})).digest("hex");
  if (!safeCompare(signature, digest)) {
    res.status(401).json({ success: false, error: "invalid HMAC signature" });
    return;
  }

  next();
}

export function requireScope(scope: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.header("x-service-key");
    if (!token) {
      res.status(401).json({ success: false, error: "missing x-service-key" });
      return;
    }

    const cached = getCachedTokenValidation(token);
    if (cached) {
      if (!cached.valid) {
        res.status(401).json({ success: false, error: "invalid or expired token" });
        return;
      }
      if (scope && !cached.scopes.includes(scope)) {
        res.status(403).json({ success: false, error: `missing scope ${scope}` });
        return;
      }
      next();
      return;
    }

    try {
      const { data } = await axios.post(
        `${env.GATEWAY_URL}/api/v1/tokens/validate`,
        { token },
        { headers: { "x-service-key": token }, timeout: 5000 }
      );

      const result: TokenValidationResult = {
        valid: Boolean(data?.data?.valid),
        scopes: Array.isArray(data?.data?.scopes) ? data.data.scopes : []
      };

      cacheTokenValidation(token, result);

      if (!result.valid) {
        res.status(401).json({ success: false, error: "invalid or expired token" });
        return;
      }

      if (scope && !result.scopes.includes(scope)) {
        res.status(403).json({ success: false, error: `missing scope ${scope}` });
        return;
      }

      next();
    } catch {
      res.status(502).json({ success: false, error: "gateway validation unavailable" });
    }
  };
}
