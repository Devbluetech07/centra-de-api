import { createHash, randomBytes } from "crypto";

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateServiceToken(): string {
  return `bt_live_${randomBytes(24).toString("hex")}`;
}
