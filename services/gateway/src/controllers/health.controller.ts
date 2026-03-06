import { Request, Response } from "express";

export function health(_: Request, res: Response): void {
  res.json({ success: true, service: "gateway", status: "ok", time: new Date().toISOString() });
}

export function docs(_: Request, res: Response): void {
  res.json({
    success: true,
    data: {
      service: "gateway",
      endpoints: [
        "GET /health",
        "GET /api/v1/docs",
        "POST /api/v1/tokens",
        "GET /api/v1/tokens",
        "DELETE /api/v1/tokens/:id",
        "POST /api/v1/tokens/validate",
        "POST /api/v1/dev/bootstrap (development)",
        "POST /api/v1/integrations/bluepoint/verificar-face"
      ]
    }
  });
}
