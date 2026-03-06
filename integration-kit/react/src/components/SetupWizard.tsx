import { useState } from "react";

export type ScopeProfileKey = "full" | "assinatura" | "documento" | "selfieDoc";

export type SetupIds = {
  orgId?: string;
  documentId: string;
  signerId: string;
};

type TokenGenerationInput = {
  name: string;
  profile: ScopeProfileKey;
  scopes: string[];
};

type TokenGenerationOutput = {
  token?: string;
};

export type SetupWizardProps = {
  serviceKey: string;
  ids: SetupIds;
  onServiceKeyChange: (value: string) => void;
  onIdsChange: (ids: SetupIds) => void;
  onGenerateToken?: (payload: TokenGenerationInput) => Promise<TokenGenerationOutput | void>;
  onGenerateTestIds?: () => Promise<SetupIds | void>;
  onCheckHealth?: () => Promise<boolean>;
};

const scopeProfiles: Record<ScopeProfileKey, { label: string; scopes: string[] }> = {
  full: {
    label: "Completo (todos os fluxos)",
    scopes: [
      "assinatura:create",
      "assinatura:read",
      "assinatura:list",
      "assinatura:delete",
      "documento:upload",
      "documento:validate",
      "documento:read",
      "documento:list",
      "documento:delete",
      "selfie-documento:capture",
      "selfie-documento:read",
      "selfie-documento:list",
      "selfie-documento:delete"
    ]
  },
  assinatura: {
    label: "Somente assinatura",
    scopes: ["assinatura:create", "assinatura:read", "assinatura:list", "assinatura:delete"]
  },
  documento: {
    label: "Somente documento",
    scopes: ["documento:upload", "documento:validate", "documento:read", "documento:list", "documento:delete"]
  },
  selfieDoc: {
    label: "Somente selfie+documento",
    scopes: ["selfie-documento:capture", "selfie-documento:read", "selfie-documento:list", "selfie-documento:delete"]
  }
};

export function SetupWizard({
  serviceKey,
  ids,
  onServiceKeyChange,
  onIdsChange,
  onGenerateToken,
  onGenerateTestIds,
  onCheckHealth
}: SetupWizardProps) {
  const [tokenName, setTokenName] = useState("Integracao Host");
  const [profile, setProfile] = useState<ScopeProfileKey>("full");
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [status, setStatus] = useState("Preencha os dados para iniciar");
  const [loading, setLoading] = useState(false);

  const serviceKeyReady = Boolean(serviceKey.trim());
  const idsReady = Boolean(ids.signerId.trim() && ids.documentId.trim());
  const healthReady = healthOk === true;
  const stepsReady = [serviceKeyReady, idsReady, healthReady].filter(Boolean).length;

  const copy = async (label: string, value: string) => {
    if (!value) {
      setStatus(`Nada para copiar em ${label}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} copiado`);
    } catch {
      setStatus("Nao foi possivel copiar automaticamente");
    }
  };

  const generateToken = async () => {
    if (!onGenerateToken) {
      setStatus("Callback onGenerateToken nao informado");
      return;
    }

    try {
      setLoading(true);
      const result = await onGenerateToken({
        name: tokenName,
        profile,
        scopes: scopeProfiles[profile].scopes
      });
      if (result?.token) {
        onServiceKeyChange(result.token);
        setStatus("Token gerado e aplicado como service key");
      } else {
        setStatus("Token solicitado. Aplique o valor retornado no seu fluxo.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao gerar token");
    } finally {
      setLoading(false);
    }
  };

  const generateIds = async () => {
    if (!onGenerateTestIds) {
      setStatus("Callback onGenerateTestIds nao informado");
      return;
    }

    try {
      setLoading(true);
      const generated = await onGenerateTestIds();
      if (generated) {
        onIdsChange(generated);
      }
      setStatus("IDs de teste gerados");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao gerar IDs");
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    if (!onCheckHealth) {
      setStatus("Callback onCheckHealth nao informado");
      return;
    }

    try {
      setLoading(true);
      const ok = await onCheckHealth();
      setHealthOk(ok);
      setStatus(ok ? "Servicos online" : "Ha servicos offline");
    } catch (error) {
      setHealthOk(false);
      setStatus(error instanceof Error ? error.message : "Erro no health check");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0 }}>Setup Rapido de Integracao</h3>
      <small>Passos concluidos: {stepsReady}/3</small>

      <div style={{ display: "grid", gap: 8 }}>
        <strong>1) Token e Service Key</strong>
        <select value={profile} onChange={(e) => setProfile(e.target.value as ScopeProfileKey)}>
          {Object.entries(scopeProfiles).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
        <input value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="Nome do token" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void generateToken()} disabled={loading}>
            Gerar token
          </button>
          <button type="button" onClick={() => void copy("Service key", serviceKey)}>
            Copiar service key
          </button>
        </div>
        <input value={serviceKey} onChange={(e) => onServiceKeyChange(e.target.value)} placeholder="service key" />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <strong>2) IDs para requests</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void generateIds()} disabled={loading}>
            Gerar IDs de teste
          </button>
          <button type="button" onClick={() => void copy("signerId", ids.signerId)}>
            Copiar signerId
          </button>
          <button type="button" onClick={() => void copy("documentId", ids.documentId)}>
            Copiar documentId
          </button>
        </div>
        <input
          value={ids.signerId}
          onChange={(e) => onIdsChange({ ...ids, signerId: e.target.value })}
          placeholder="signerId"
        />
        <input
          value={ids.documentId}
          onChange={(e) => onIdsChange({ ...ids, documentId: e.target.value })}
          placeholder="documentId"
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <strong>3) Conferir ambiente</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => void checkHealth()} disabled={loading}>
            Rodar health check
          </button>
          <small>{healthOk === null ? "Nao validado" : healthOk ? "Online" : "Offline"}</small>
        </div>
      </div>

      <small>{status}</small>
    </div>
  );
}
