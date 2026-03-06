import axios from "axios";
import { env } from "./env";

export async function validateSelfieDocument(imageBase64: string): Promise<{
  bothValid: boolean;
  canCapture: boolean;
  faceStatus: { detected: boolean; centered: boolean };
  docStatus: { detected: boolean; readable: boolean };
  feedback: string;
}> {
  const { data } = await axios.post(`${env.VALIDATOR_URL}/api/v1/validate/selfie-document`, { imageBase64 });
  return data.data;
}
