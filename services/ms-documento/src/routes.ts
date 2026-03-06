import { Router } from "express";
import { z } from "zod";
import { db } from "./db";
import { validateDocumentRealtime } from "./validator";
import { uploadDocument, uploadDocumentCombinado } from "./service";
import { requireHmac, requireScope } from "./middleware/auth";

const router = Router();

const uploadSchema = z.object({
  signatoryId: z.string().uuid(),
  documentId: z.string().uuid(),
  imageBase64: z.string().min(100),
  type: z.enum(["rg", "cnh", "cnh_digital", "passport"]),
  side: z.enum(["front", "back", "single"]),
  ip: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  userAgent: z.string().optional()
});

router.get("/health", (_, res) => res.json({ success: true, service: "ms-documento" }));
router.get("/api/v1/docs", (_, res) => res.json({ success: true, data: { service: "ms-documento" } }));

router.post("/api/v1/documento/upload", requireScope("documento:upload"), requireHmac, async (req, res) => {
  try {
    const payload = uploadSchema.parse(req.body);
    const data = await uploadDocument(payload);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "payload invalido", details: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: "erro ao enviar documento" });
  }
});

const uploadCombinadoSchema = z.object({
  signatoryId: z.string().uuid(),
  documentId: z.string().uuid(),
  imageFrenteBase64: z.string().min(100),
  imageVersoBase64: z.string().min(100).optional(),
  type: z.enum(["rg", "cnh", "cnh_digital", "passport"]),
  ip: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  userAgent: z.string().optional()
});

router.post("/api/v1/documento/upload-completo", requireScope("documento:upload"), requireHmac, async (req, res) => {
  try {
    const payload = uploadCombinadoSchema.parse(req.body);
    const data = await uploadDocumentCombinado(payload);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "payload invalido", details: error.issues });
      return;
    }
    const msg = error instanceof Error ? error.message : "erro ao enviar documento";
    console.error("[upload-completo]", msg);
    res.status(500).json({ success: false, error: msg });
  }
});

router.post("/api/v1/documento/validar", requireScope("documento:validate"), async (req, res) => {
  try {
    const payload = uploadSchema.pick({ imageBase64: true, type: true, side: true }).parse(req.body);
    const data = await validateDocumentRealtime(payload.imageBase64, payload.type, payload.side);
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "payload invalido", details: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: "erro ao validar documento" });
  }
});

router.get("/api/v1/documento/:id", requireScope("documento:read"), async (req, res) => {
  const { rows } = await db.query("SELECT * FROM documentos_signatario WHERE id = $1", [req.params.id]);
  res.json({ success: true, data: rows[0] ?? null });
});

router.get("/api/v1/documentos", requireScope("documento:list"), async (req, res) => {
  const { documentId, signatoryId } = req.query;
  const { rows } = await db.query(
    `SELECT * FROM documentos_signatario
      WHERE ($1::uuid IS NULL OR document_id = $1)
      AND ($2::uuid IS NULL OR signatory_id = $2)
      ORDER BY uploaded_at DESC`,
    [documentId ?? null, signatoryId ?? null]
  );
  res.json({ success: true, data: rows });
});

router.delete("/api/v1/documento/:id", requireScope("documento:delete"), async (req, res) => {
  await db.query("DELETE FROM documentos_signatario WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
