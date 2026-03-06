import { Router } from "express";
import { createToken, listTokens, revokeToken, validateToken } from "../controllers/tokens.controller";
import { docs, health } from "../controllers/health.controller";
import { bootstrapTestData } from "../controllers/dev.controller";
import { verifyBluepointFace } from "../controllers/integrations.controller";

const router = Router();

router.get("/health", health);
router.get("/api/v1/docs", docs);
router.post("/api/v1/tokens", createToken);
router.get("/api/v1/tokens", listTokens);
router.delete("/api/v1/tokens/:id", revokeToken);
router.post("/api/v1/tokens/validate", validateToken);
router.post("/api/v1/dev/bootstrap", bootstrapTestData);
router.post("/api/v1/integrations/bluepoint/verificar-face", verifyBluepointFace);

export default router;
