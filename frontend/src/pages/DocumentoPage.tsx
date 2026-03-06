import { useMemo, useState } from "react";
import { uploadDocumento } from "../services/api";

export function DocumentoPage() {
  const [imageBase64, setImageBase64] = useState("");
  const [status, setStatus] = useState("Aguardando imagem");
  const [type, setType] = useState("rg");
  const [side, setSide] = useState("front");
  const canCapture = useMemo(() => imageBase64.length > 100, [imageBase64]);

  async function handleCapture() {
    const payload = {
      signatoryId: crypto.randomUUID(),
      documentId: crypto.randomUUID(),
      imageBase64,
      type,
      side,
      userAgent: navigator.userAgent
    };
    const res = await uploadDocumento(payload);
    setStatus(`Capturado e salvo no MinIO: ${res.data.path}`);
  }

  return (
    <div className="card">
      <h2>Captura de Documento</h2>
      <div className="row">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="rg">RG</option>
          <option value="cnh">CNH</option>
          <option value="cnh_digital">CNH Digital</option>
          <option value="passport">Passaporte</option>
        </select>
        <select className="input" value={side} onChange={(e) => setSide(e.target.value)}>
          <option value="front">Frente</option>
          <option value="back">Verso</option>
          <option value="single">Unico</option>
        </select>
      </div>
      <div className="capture-guide" style={{ marginTop: 12 }}>Guia retangular de enquadramento</div>
      <textarea className="input" rows={6} style={{ marginTop: 12 }} value={imageBase64} onChange={(e) => setImageBase64(e.target.value)} placeholder="Cole base64 da captura" />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="button" disabled={!canCapture} onClick={handleCapture}>CAPTURAR E ENVIAR</button>
        <span className={canCapture ? "status-ok" : "status-danger"}>{canCapture ? "pronto para capturar" : "aguardando enquadramento"}</span>
      </div>
      <div className="status-warn" style={{ marginTop: 8 }}>{status}</div>
    </div>
  );
}
