import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { z } from "zod";
import { db } from "../config/database";
import { env } from "../config/env";

const bootstrapSchema = z.object({
  organizationName: z.string().min(2).default("BlueTech Local Org"),
  documentTitle: z.string().min(2).default("Documento de Teste"),
  signatoryName: z.string().min(2).default("Signatario Teste"),
  signatoryEmail: z.string().email().default("signatario.teste@local.dev")
});

export async function bootstrapTestData(req: Request, res: Response): Promise<void> {
  if (env.NODE_ENV !== "development") {
    res.status(403).json({ success: false, error: "dev endpoint disabled" });
    return;
  }

  const payload = bootstrapSchema.parse(req.body ?? {});
  const orgId = randomUUID();
  const documentId = randomUUID();
  const signatoryId = randomUUID();

  await db.query(
    `INSERT INTO organizacoes (id, name, email)
     VALUES ($1, $2, $3)`,
    [orgId, payload.organizationName, payload.signatoryEmail]
  );

  await db.query(
    `INSERT INTO documentos (id, org_id, title, status)
     VALUES ($1, $2, $3, 'draft')`,
    [documentId, orgId, payload.documentTitle]
  );

  await db.query(
    `INSERT INTO signatarios (id, document_id, name, email, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [signatoryId, documentId, payload.signatoryName, payload.signatoryEmail]
  );

  res.status(201).json({
    success: true,
    data: {
      orgId,
      documentId,
      signatoryId
    }
  });
}

