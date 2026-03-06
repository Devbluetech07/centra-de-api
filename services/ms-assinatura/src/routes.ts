import { Request, Router } from "express";
import { z } from "zod";
import { saveSignature } from "./service";
import { db } from "./db";
import { requireHmac, requireScope } from "./middleware/auth";

const router = Router();

const drawSchema = z.object({
  signatoryId: z.string().uuid(),
  documentId: z.string().uuid(),
  imageBase64: z.string().min(100),
  ip: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  userAgent: z.string().optional()
});

const typedSchema = z.object({
  signatoryId: z.string().uuid(),
  documentId: z.string().uuid(),
  text: z.string().min(2).max(200),
  ip: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  userAgent: z.string().optional()
});

function readHeaderCoordinate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pickFirstHeaderValue(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((part) => part.trim())
    .find(Boolean);
}

function extractClientIp(req: Request): string | undefined {
  const fromCf = pickFirstHeaderValue(req.header("cf-connecting-ip") ?? undefined);
  const fromForwarded = pickFirstHeaderValue(req.header("x-forwarded-for") ?? undefined);
  const fromRealIp = pickFirstHeaderValue(req.header("x-real-ip") ?? undefined);
  const fromSocket = req.ip?.replace(/^::ffff:/, "").trim();
  const candidate = fromCf || fromForwarded || fromRealIp || fromSocket;
  if (!candidate) return undefined;
  return candidate === "::1" ? "127.0.0.1" : candidate;
}

router.get("/health", (_, res) => res.json({ success: true, service: "ms-assinatura" }));
router.get("/api/v1/docs", (_, res) => res.json({ success: true, data: { service: "ms-assinatura" } }));

router.post("/api/v1/assinatura/desenho", requireScope("assinatura:create"), requireHmac, async (req, res) => {
  try {
    const payload = drawSchema.parse(req.body);
    const data = await saveSignature({
      ...payload,
      type: "drawn",
      ip: payload.ip ?? extractClientIp(req),
      latitude: payload.latitude ?? readHeaderCoordinate(req.header("x-latitude") ?? req.header("x-geo-latitude") ?? undefined),
      longitude: payload.longitude ?? readHeaderCoordinate(req.header("x-longitude") ?? req.header("x-geo-longitude") ?? undefined),
      userAgent: payload.userAgent ?? req.header("user-agent") ?? undefined
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "payload invalido", details: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: "erro ao salvar assinatura" });
  }
});

router.post("/api/v1/assinatura/tipografica", requireScope("assinatura:create"), requireHmac, async (req, res) => {
  try {
    const payload = typedSchema.parse(req.body);
    const data = await saveSignature({
      signatoryId: payload.signatoryId,
      documentId: payload.documentId,
      text: payload.text,
      imageBase64: "",
      ip: payload.ip ?? extractClientIp(req),
      latitude: payload.latitude ?? readHeaderCoordinate(req.header("x-latitude") ?? req.header("x-geo-latitude") ?? undefined),
      longitude: payload.longitude ?? readHeaderCoordinate(req.header("x-longitude") ?? req.header("x-geo-longitude") ?? undefined),
      userAgent: payload.userAgent ?? req.header("user-agent") ?? undefined,
      type: "typed"
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "payload invalido", details: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: "erro ao salvar assinatura" });
  }
});

router.get("/api/v1/assinatura/:id", requireScope("assinatura:read"), async (req, res) => {
  const { rows } = await db.query("SELECT * FROM assinaturas WHERE id = $1", [req.params.id]);
  res.json({ success: true, data: rows[0] ?? null });
});

router.get("/api/v1/assinaturas", requireScope("assinatura:list"), async (req, res) => {
  const { documentId, signatoryId } = req.query;
  const { rows } = await db.query(
    `SELECT * FROM assinaturas
     WHERE ($1::uuid IS NULL OR document_id = $1)
       AND ($2::uuid IS NULL OR signatory_id = $2)
     ORDER BY signed_at DESC`,
    [documentId ?? null, signatoryId ?? null]
  );
  res.json({ success: true, data: rows });
});

router.delete("/api/v1/assinatura/:id", requireScope("assinatura:delete"), async (req, res) => {
  await db.query("DELETE FROM assinaturas WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
