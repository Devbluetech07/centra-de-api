import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { db } from "./config/database";
import { redisClient } from "./config/redis";
import { requestLogger } from "./middleware/logger.middleware";
import { globalRateLimit } from "./middleware/rateLimit.middleware";
import routes from "./routes";

async function bootstrap(): Promise<void> {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: "*", credentials: false }));
  app.use(express.json({ limit: "12mb" }));
  app.use(requestLogger);
  app.use(globalRateLimit);
  app.use(routes);

  await db.query("SELECT 1");
  await redisClient.connect();

  app.listen(Number(env.GATEWAY_PORT), () => {
    console.log(JSON.stringify({ service: "gateway", event: "started", port: Number(env.GATEWAY_PORT) }));
  });
}

bootstrap().catch((error) => {
  console.error("gateway_bootstrap_error", error);
  process.exit(1);
});
