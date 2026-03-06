import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./env";
import { db } from "./db";
import { ensureBucket } from "./minio";
import routes from "./routes";

async function main(): Promise<void> {
  await db.query("SELECT 1");
  await ensureBucket();

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: "12mb" }));
  app.use(routes);

  app.listen(Number(env.PORT), () => {
    console.log(JSON.stringify({ service: "ms-selfie-documento", event: "started", port: Number(env.PORT) }));
  });
}

main().catch((error) => {
  console.error("ms-selfie-documento-startup-error", error);
  process.exit(1);
});
