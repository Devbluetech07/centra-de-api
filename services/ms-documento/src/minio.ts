import { Client } from "minio";
import { env } from "./env";

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: Number(env.MINIO_PORT),
  useSSL: env.MINIO_USE_SSL === "true",
  accessKey: env.MINIO_ROOT_USER,
  secretKey: env.MINIO_ROOT_PASSWORD
});

export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(env.BUCKET_DOCUMENTOS);
  if (!exists) await minioClient.makeBucket(env.BUCKET_DOCUMENTOS, "us-east-1");
}
