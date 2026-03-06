import { useState } from "react";

type SelfieDocumentCaptureProps = {
  validatorWsUrl: string;
  onCapture: (base64Jpg: string) => void;
};

type ValidationMessage = {
  canCapture?: boolean;
  validationIssues?: string[];
};

export function SelfieDocumentCapture({ validatorWsUrl, onCapture }: SelfieDocumentCaptureProps) {
  const [issues, setIssues] = useState<string[]>([]);
  const [canCapture, setCanCapture] = useState(true);

  const fileToBase64 = async (file: File) => {
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
    return `data:${file.type || "image/jpeg"};base64,${btoa(binary)}`;
  };

  const onSelect = async (file?: File | null) => {
    if (!file) return;
    const imageBase64 = await fileToBase64(file);

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${validatorWsUrl}/ws/validate-selfie-document`);
    } catch {
      onCapture(imageBase64);
      return;
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as ValidationMessage;
      setCanCapture(Boolean(msg.canCapture));
      setIssues(msg.validationIssues ?? []);
      if (msg.canCapture) onCapture(imageBase64);
      ws?.close();
    };
    ws.onerror = () => {
      onCapture(imageBase64);
      ws?.close();
    };
    ws.onopen = () => {
      ws?.send(JSON.stringify({ imageBase64 }));
    };
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input type="file" accept="image/*" onChange={(e) => void onSelect(e.target.files?.[0])} />
      {!canCapture && issues.length > 0 ? <small>Validacoes: {issues.join(", ")}</small> : null}
    </div>
  );
}
