import { Request, Response } from "express";
import { z } from "zod";
import { TokenService } from "../services/token.service";

const tokenService = new TokenService();

const createSchema = z.object({
  orgId: z.string().uuid().optional(),
  name: z.string().min(2),
  scopes: z.array(z.string()).default([]),
  expiresInDays: z.number().int().positive().optional()
});

export async function createToken(req: Request, res: Response): Promise<void> {
  const data = createSchema.parse(req.body);
  const created = await tokenService.createToken({
    orgId: data.orgId,
    name: data.name,
    scopes: data.scopes,
    expiresInDays: data.expiresInDays
  });
  res.status(201).json({ success: true, data: created });
}

export async function listTokens(req: Request, res: Response): Promise<void> {
  const orgId = req.query.orgId as string | undefined;
  const data = await tokenService.listTokens(orgId);
  res.json({ success: true, data });
}

export async function revokeToken(req: Request, res: Response): Promise<void> {
  await tokenService.revokeToken(req.params.id);
  res.json({ success: true });
}

export async function validateToken(req: Request, res: Response): Promise<void> {
  const token = String(req.body.token ?? req.header("x-service-key") ?? "");
  const data = await tokenService.validateToken(token);
  res.json({ success: true, data });
}
