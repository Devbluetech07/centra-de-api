import { useMemo, useState } from "react";
import { capturarSelfieDocumento } from "../services/api";

export function SelfieDocumentoPage() {
  const [imageBase64, setImageBase64] = useState("");
  const [status, setStatus] = useState("Aguardando imagem");
  const canCapture = useMemo(() => imageBase64.length > 100, [imageBase64]);

  async function handleCapture() {
    const payload = {
      signatoryId: crypto.randomUUID(),
      documentId: crypto.randomUUID(),
      imageBase64,
      userAgent: navigator.userAgent
    };
    const res = await capturarSelfieDocumento(payload);
    setStatus(`Selfie+Doc salvo no MinIO: ${res.data.path}`);
  }

  return (
    <div className="card">
      <h2>Selfie com Documento</h2>
      <div className="capture-guide">Guia oval + retangulo (rosto e documento)</div>
      <textarea className="input" rows={7} style={{ marginTop: 12 }} value={imageBase64} onChange={(e) => setImageBase64(e.target.value)} placeholder="Cole base64 da captura" />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="button" disabled={!canCapture} onClick={handleCapture}>CAPTURAR SELFIE+DOC</button>
        <span className={canCapture ? "status-ok" : "status-danger"}>{canCapture ? "enquadramento valido" : "centralize rosto e documento"}</span>
      </div>
      <div className="status-warn" style={{ marginTop: 8 }}>{status}</div>
    </div>
  );
}
