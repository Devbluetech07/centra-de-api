import { Router } from "express";
import { z } from "zod";
import { db } from "./db";
import { captureSelfieDocument } from "./service";
import { requireHmac, requireScope } from "./middleware/auth";

const router = Router();

const captureSchema = z.object({
  signatoryId: z.string().uuid(),
  documentId: z.string().uuid(),
  imageBase64: z.string().min(100),
  ip: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  userAgent: z.string().optional()
});

router.get("/health", (_, res) => res.json({ success: true, service: "ms-selfie-documento" }));
router.get("/api/v1/docs", (_, res) => res.json({ success: true, data: { service: "ms-selfie-documento" } }));

router.post("/api/v1/selfie-documento/capturar", requireScope("selfie-documento:capture"), requireHmac, async (req, res) => {
  try {
    const payload = captureSchema.parse(req.body);
    const data = await captureSelfieDocument(payload);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "payload invalido", details: error.issues });
      return;
    }
    console.error("selfie-documento:capture error", error);
    res.status(500).json({ success: false, error: "erro ao capturar selfie+documento" });
  }
});

router.get("/api/v1/selfie-documento/:id", requireScope("selfie-documento:read"), async (req, res) => {
  const { rows } = await db.query("SELECT * FROM selfies_documentos WHERE id = $1", [req.params.id]);
  res.json({ success: true, data: rows[0] ?? null });
});

router.get("/api/v1/selfie-documentos", requireScope("selfie-documento:list"), async (req, res) => {
  const { documentId, signatoryId } = req.query;
  const { rows } = await db.query(
    `SELECT * FROM selfies_documentos
      WHERE ($1::uuid IS NULL OR document_id = $1)
      AND ($2::uuid IS NULL OR signatory_id = $2)
      ORDER BY captured_at DESC`,
    [documentId ?? null, signatoryId ?? null]
  );
  res.json({ success: true, data: rows });
});

router.delete("/api/v1/selfie-documento/:id", requireScope("selfie-documento:delete"), async (req, res) => {
  await db.query("DELETE FROM selfies_documentos WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
