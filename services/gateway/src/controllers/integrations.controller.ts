import { Request, Response } from "express";
import { z } from "zod";

const bluepointSchema = z.object({
  token: z.string().min(10),
  imagem: z.string().min(50),
  baseUrl: z.string().url().optional()
});

export async function verifyBluepointFace(req: Request, res: Response): Promise<void> {
  const payload = bluepointSchema.parse(req.body);
  const baseUrl = (payload.baseUrl ?? "https://bluepoint-api.bluetechfilms.com.br").replace(/\/+$/, "");
  const targetUrl = `${baseUrl}/api/v1/biometria/verificar-face`;

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${payload.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ imagem: payload.imagem })
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  res.status(response.status).json({
    success: response.ok,
    status: response.status,
    data: body
  });
}
