import axios from "axios";
import { env } from "./env";

export async function validateDocumentRealtime(imageBase64: string, type: string, side: string): Promise<{ canCapture: boolean; feedback: string; confidence: number; quality: string }> {
  const { data } = await axios.post(`${env.VALIDATOR_URL}/api/v1/validate/document`, {
    imageBase64,
    type,
    side
  });
  return data.data;
}
