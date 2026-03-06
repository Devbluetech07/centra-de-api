import { useState } from "react";
import { salvarAssinatura } from "../services/api";

export function AssinaturaPage() {
  const [base64, setBase64] = useState("");
  const [status, setStatus] = useState("Aguardando assinatura");

  async function handleSubmit() {
    if (!base64) return;
    await salvarAssinatura({
      signatoryId: crypto.randomUUID(),
      documentId: crypto.randomUUID(),
      imageBase64: base64,
      userAgent: navigator.userAgent
    });
    setStatus("Assinatura enviada com sucesso");
  }

  return (
    <div className="card">
      <h2>Captura de Assinatura</h2>
      <textarea className="input" rows={8} value={base64} onChange={(e) => setBase64(e.target.value)} placeholder="Cole base64 da assinatura" />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="button" onClick={handleSubmit}>ENVIAR ASSINATURA</button>
        <span className="status-warn">{status}</span>
      </div>
    </div>
  );
}
