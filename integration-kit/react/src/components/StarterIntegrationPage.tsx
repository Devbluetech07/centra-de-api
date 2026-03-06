import { useMemo, useState } from "react";
import { createBlueTechClient } from "../services/bluetechApi";
import { DocumentCapture } from "./DocumentCapture";
import { SelfieDocumentCapture } from "./SelfieDocumentCapture";
import { SetupWizard } from "./SetupWizard";
import { SignaturePad } from "./SignaturePad";

type StarterIntegrationPageProps = {
  gatewayUrl: string;
  assinaturaUrl: string;
  documentoUrl: string;
  selfieDocumentoUrl: string;
  validatorWsUrl: string;
  initialServiceKey?: string;
};

export function StarterIntegrationPage({
  gatewayUrl,
  assinaturaUrl,
  documentoUrl,
  selfieDocumentoUrl,
  validatorWsUrl,
  initialServiceKey = ""
}: StarterIntegrationPageProps) {
  const [serviceKey, setServiceKey] = useState(initialServiceKey);
  const [ids, setIds] = useState<{ orgId?: string; signerId: string; documentId: string }>({
    orgId: "",
    signerId: "",
    documentId: ""
  });
  const [signatureBase64, setSignatureBase64] = useState("");
  const [signatureName, setSignatureName] = useState("Assinatura Teste");
  const [documentBase64, setDocumentBase64] = useState("");
  const [selfieDocBase64, setSelfieDocBase64] = useState("");
  const [status, setStatus] = useState("Pronto para integrar");
  const [logs, setLogs] = useState<string[]>([]);

  const client = useMemo(
    () =>
      createBlueTechClient({
        gatewayUrl,
        assinaturaUrl,
        documentoUrl,
        selfieDocumentoUrl,
        validatorWsUrl,
        serviceKey
      }),
    [gatewayUrl, assinaturaUrl, documentoUrl, selfieDocumentoUrl, validatorWsUrl]
  );

  client.setServiceKey(serviceKey);

  const addLog = (message: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()} ${message}`, ...prev].slice(0, 20));
  };

  const ensureIds = () => {
    if (!ids.signerId || !ids.documentId) {
      throw new Error("Preencha signerId e documentId antes de enviar");
    }
  };

  const sendDrawnSignature = async () => {
    try {
      ensureIds();
      if (!signatureBase64) throw new Error("Desenhe a assinatura antes de enviar");
      await client.saveSignatureDrawn({
        signerId: ids.signerId,
        documentId: ids.documentId,
        imageBase64: signatureBase64
      });
      setStatus("Assinatura desenhada enviada");
      addLog("Assinatura desenhada enviada");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar assinatura";
      setStatus(message);
      addLog(message);
    }
  };

  const sendTypedSignature = async () => {
    try {
      ensureIds();
      if (!signatureName.trim()) throw new Error("Informe o nome para assinatura tipografica");
      await client.saveSignatureTyped({
        signerId: ids.signerId,
        documentId: ids.documentId,
        fullName: signatureName
      });
      setStatus("Assinatura tipografica enviada");
      addLog("Assinatura tipografica enviada");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar assinatura tipografica";
      setStatus(message);
      addLog(message);
    }
  };

  const sendDocument = async () => {
    try {
      ensureIds();
      if (!documentBase64) throw new Error("Capture o documento antes de enviar");
      await client.uploadDocument({
        signerId: ids.signerId,
        documentId: ids.documentId,
        type: "rg",
        side: "front",
        imageBase64: documentBase64
      });
      setStatus("Documento enviado");
      addLog("Documento enviado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar documento";
      setStatus(message);
      addLog(message);
    }
  };

  const sendSelfieDoc = async () => {
    try {
      ensureIds();
      if (!selfieDocBase64) throw new Error("Capture selfie+documento antes de enviar");
      await client.uploadSelfieDocument({
        signerId: ids.signerId,
        documentId: ids.documentId,
        imageBase64: selfieDocBase64
      });
      setStatus("Selfie+documento enviado");
      addLog("Selfie+documento enviado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar selfie+documento";
      setStatus(message);
      addLog(message);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h2 style={{ margin: 0 }}>Starter Integrador BlueTech Sign</h2>

      <SetupWizard
        serviceKey={serviceKey}
        ids={ids}
        onServiceKeyChange={setServiceKey}
        onIdsChange={setIds}
        onGenerateToken={async ({ name, scopes }) => {
          const response = (await client.createToken({ name, scopes })) as { data?: { token?: string } };
          return { token: response.data?.token };
        }}
        onGenerateTestIds={async () => {
          const response = await client.bootstrapTestIds();
          return {
            orgId: response.data.orgId ?? "",
            signerId: response.data.signatoryId,
            documentId: response.data.documentId
          };
        }}
        onCheckHealth={async () => {
          const response = await fetch(`${gatewayUrl}/health`);
          return response.ok;
        }}
      />

      <section style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Assinatura</h3>
        <SignaturePad onChange={setSignatureBase64} />
        <button type="button" onClick={() => void sendDrawnSignature()}>
          Enviar assinatura desenhada
        </button>
        <input
          value={signatureName}
          onChange={(e) => setSignatureName(e.target.value)}
          placeholder="Nome para assinatura tipografica"
        />
        <button type="button" onClick={() => void sendTypedSignature()}>
          Enviar assinatura tipografica
        </button>
      </section>

      <section style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Documento</h3>
        <DocumentCapture validatorWsUrl={validatorWsUrl} type="rg" side="front" onCapture={setDocumentBase64} />
        <button type="button" onClick={() => void sendDocument()}>
          Enviar documento
        </button>
      </section>

      <section style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Selfie + Documento</h3>
        <SelfieDocumentCapture validatorWsUrl={validatorWsUrl} onCapture={setSelfieDocBase64} />
        <button type="button" onClick={() => void sendSelfieDoc()}>
          Enviar selfie+documento
        </button>
      </section>

      <section style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 12 }}>
        <strong>Status:</strong> <span>{status}</span>
        <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
          {logs.map((line) => (
            <small key={line}>{line}</small>
          ))}
        </div>
      </section>
    </div>
  );
}
