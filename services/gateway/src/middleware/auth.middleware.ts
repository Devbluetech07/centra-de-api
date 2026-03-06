import { Request, Response, NextFunction } from "express";
import { db } from "../config/database";
import { hashToken } from "../lib/crypto";

export async function requireServiceScope(scope: string, req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.header("x-service-key");
  if (!token) {
    res.status(401).json({ success: false, error: "missing x-service-key" });
    return;
  }

  const tokenHash = hashToken(token);
  const result = await db.query(
    `SELECT id, scopes, is_active, expires_at
     FROM tokens_api
     WHERE token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );

  if (!result.rowCount) {
    res.status(401).json({ success: false, error: "invalid token" });
    return;
  }

  const row = result.rows[0];
  const expired = row.expires_at && new Date(row.expires_at) < new Date();
  if (!row.is_active || expired) {
    res.status(401).json({ success: false, error: "token inactive or expired" });
    return;
  }

  const scopes = Array.isArray(row.scopes) ? row.scopes : [];
  if (scope && !scopes.includes(scope)) {
    res.status(403).json({ success: false, error: "insufficient scope" });
    return;
  }

  await db.query("UPDATE tokens_api SET last_used_at = now() WHERE id = $1", [row.id]);
  next();
}
