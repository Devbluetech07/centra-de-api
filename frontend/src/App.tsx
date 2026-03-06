import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { gsap } from "gsap";
import {
  bootstrapTestIds,
  capturarSelfieDocumento,
  createToken,
  fetchGatewayDocs,
  fetchServiceHealth,
  listTokens,
  revokeAllTokens,
  revokeToken,
  salvarAssinatura,
  salvarAssinaturaTipografica,
  setServiceKey,
  uploadDocumentoCombinado,
  validateServiceKey,
  verifyBluepointFace
} from "./services/api";
import { CameraCapture } from "./components/CameraCapture";
import { SignatureCanvas } from "./components/SignatureCanvas";
import { TypedSignatureCanvas } from "./components/TypedSignatureCanvas";
import { AnimatedList } from "./components/AnimatedList";
import { MagicBento } from "./components/MagicBento";

type TabKey = "tokens" | "assinatura" | "documento" | "selfie" | "selfieDoc" | "docs";
type ScopeProfileKey = "full" | "assinatura" | "documento" | "selfieDoc";
type ModuleExecutionView = "normal" | "pc" | "celular";


type TestIds = {
  orgId: string;
  documentId: string;
  signatoryId: string;
};

type LiveValidation = {
  canCapture: boolean;
  feedback: string;
  validationIssues?: string[];
};

type TokenRow = {
  id: string;
  name: string;
  scopes: string[];
  is_active?: boolean;
  created_at?: string;
  expires_at?: string | null;
  last_used_at?: string | null;
};
type DocFlowStep = "select" | "front" | "back" | "review";

const tabs: { key: TabKey; label: string }[] = [
  { key: "tokens", label: "TOKENS" },
  { key: "assinatura", label: "ASSINATURA" },
  { key: "documento", label: "DOCUMENTO" },
  { key: "selfie", label: "SELFIE" },
  { key: "selfieDoc", label: "SELFIE+DOC" },
  { key: "docs", label: "DOCS" }
];

const defaultScopes = [
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
];

const scopeProfiles: Record<ScopeProfileKey, { label: string; scopes: string[] }> = {
  full: { label: "Completo (todos os fluxos)", scopes: defaultScopes },
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

const docTypeOptions = [
  { value: "rg", label: "RG", needsBack: true, subtitle: "Frente + verso", icon: "🪪", badge: "Mais usado" },
  { value: "cnh", label: "CNH", needsBack: true, subtitle: "Frente + verso", icon: "🚗", badge: "Recomendado" },
  { value: "passport", label: "Passaporte", needsBack: false, subtitle: "Pagina principal", icon: "🛂", badge: "Internacional" }
];
const BRASILIA_TIMEZONE = "America/Sao_Paulo";

function formatApiError(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return "Erro inesperado";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("tokens");
  const [moduleExecutionView, setModuleExecutionView] = useState<Record<TabKey, ModuleExecutionView>>({
    tokens: "normal",
    assinatura: "normal",
    documento: "normal",
    selfie: "normal",
    selfieDoc: "normal",
    docs: "normal"
  });
  const [serviceKey, setKey] = useState("");
  const [serviceKeyStatus, setServiceKeyStatus] = useState("Token ainda nao validado");
  const [tokenName, setTokenName] = useState("");
  const [expiresInDaysInput, setExpiresInDaysInput] = useState("");
  const [scopeProfile, setScopeProfile] = useState<ScopeProfileKey>("full");
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [lastToken, setLastToken] = useState("");
  const [showTokenList, setShowTokenList] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [revokeConfirm, setRevokeConfirm] = useState<{ id: string; name: string } | null>(null);
  const [revokeConfirmInput, setRevokeConfirmInput] = useState("");
  const [testIds, setTestIds] = useState<TestIds>({ orgId: "", documentId: "", signatoryId: "" });
  const [logs, setLogs] = useState<string[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("Sistema inicializado");

  const [geoCoords, setGeoCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [signatureMode, setSignatureMode] = useState<"desenhar" | "digitar">("desenhar");
  const [signatureBase64, setSignatureBase64] = useState("");
  const [signatureText, setSignatureText] = useState("");

  const [docType, setDocType] = useState("rg");
  const [docFlowStep, setDocFlowStep] = useState<DocFlowStep>("select");
  const [docBackStepCueVisible, setDocBackStepCueVisible] = useState(false);
  const [frontDocumentBase64, setFrontDocumentBase64] = useState("");
  const [backDocumentBase64, setBackDocumentBase64] = useState("");
  const [docValidation, setDocValidation] = useState<LiveValidation>({ canCapture: false, feedback: "Aguardando camera" });

  const [selfieBase64, setSelfieBase64] = useState("");
  const [selfieValidation, setSelfieValidation] = useState<LiveValidation>({ canCapture: false, feedback: "Aguardando camera" });
  const [selfieApiUrl, setSelfieApiUrl] = useState("https://bluepoint-api.bluetechfilms.com.br");
  const [selfieApiToken, setSelfieApiToken] = useState("");
  const [selfieApiStatus, setSelfieApiStatus] = useState("API BluePoint nao validada");
  const [bluepointResult, setBluepointResult] = useState("");

  const [selfieDocBase64, setSelfieDocBase64] = useState("");
  const [selfieDocValidation, setSelfieDocValidation] = useState<LiveValidation>({ canCapture: false, feedback: "Aguardando camera" });

  const healthCount = useMemo(
    () => logs.filter((line) => line.toLowerCase().includes("health check") && line.includes("5/5")).length,
    [logs]
  );

  const selectedDoc = docTypeOptions.find((doc) => doc.value === docType) ?? docTypeOptions[0];
  const needsBack = selectedDoc.needsBack;
  const documentReady = Boolean(frontDocumentBase64 && (!needsBack || backDocumentBase64));
  const idsReady = Boolean(testIds.signatoryId.trim() && testIds.documentId.trim());
  const activeTokenCount = tokens.length;
  const selectedScopeCount = scopeProfiles[scopeProfile].scopes.length;
  const uniqueScopeCount = new Set(tokens.flatMap((token) => token.scopes ?? [])).size;
  const selectedToken = tokens.find((token) => token.id === selectedTokenId) ?? null;
  const selectedTokenIndex = tokens.findIndex((token) => token.id === selectedTokenId);
  const isProcessTab = activeTab === "assinatura" || activeTab === "documento" || activeTab === "selfie" || activeTab === "selfieDoc";
  const activeExecutionView = moduleExecutionView[activeTab];
  const executionViewForRender: ModuleExecutionView = isProcessTab ? activeExecutionView : "normal";
  const serviceKeyStatusLower = serviceKeyStatus.toLowerCase();
  const serviceKeyStatusClass = serviceKeyStatusLower.includes("sucesso")
    ? "status-ok"
    : serviceKeyStatusLower.includes("revogado") || serviceKeyStatusLower.includes("invalido") || serviceKeyStatusLower.includes("expirado") || serviceKeyStatusLower.includes("falha")
      ? "status-danger"
      : "status-warn";

  useEffect(() => {
    if (docFlowStep !== "back") {
      setDocBackStepCueVisible(false);
      return;
    }
    setDocBackStepCueVisible(true);
    const timer = window.setTimeout(() => setDocBackStepCueVisible(false), 1900);
    return () => window.clearTimeout(timer);
  }, [docFlowStep]);

  function goToDocFlowStep(nextStep: DocFlowStep) {
    setDocFlowStep(nextStep);
    if (nextStep === "back") {
      setStatusMessage("Agora tire a foto do VERSO do documento.");
    }
  }

  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString("pt-BR", { timeZone: BRASILIA_TIMEZONE, hour12: false });
    setLogs((prev) => [`${timestamp}  ${message}`, ...prev].slice(0, 80));
  }

  function formatDateLabel(value?: string | null): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("pt-BR", {
      timeZone: BRASILIA_TIMEZONE,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function getTokenValidityLabel(token: TokenRow): string {
    if (!token.expires_at) return "Sem expiracao automatica (vigente ate revogacao manual)";
    const expiresDate = new Date(token.expires_at);
    if (Number.isNaN(expiresDate.getTime())) return "Validade indefinida";
    if (expiresDate.getTime() < Date.now()) return `Expirado em ${formatDateLabel(token.expires_at)}`;
    return `Vigente ate ${formatDateLabel(token.expires_at)}`;
  }

  async function refreshTokens() {
    try {
      const response = await listTokens();
      setTokens(response.data ?? []);
    } catch (error) {
      addLog(`Falha ao listar tokens: ${formatApiError(error)}`);
    }
  }

  async function generateToken() {
    if (!tokenName.trim()) {
      setStatusMessage("Informe um nome para o token");
      return;
    }

    const expiryDays = expiresInDaysInput.trim() ? Number(expiresInDaysInput) : undefined;
    if (expiryDays !== undefined && (!Number.isFinite(expiryDays) || expiryDays <= 0 || !Number.isInteger(expiryDays))) {
      setStatusMessage("A validade deve ser um numero inteiro de dias (ex.: 30)");
      return;
    }

    try {
      const response = await createToken(tokenName.trim(), scopeProfiles[scopeProfile].scopes, expiryDays);
      const token = response.data.token as string;
      setLastToken(token);
      setKey(token);
      setServiceKey(token);
      setSelectedTokenId(response.data.id as string);
      setShowTokenList(true);
      await refreshTokens();
      setStatusMessage(expiryDays ? `Token gerado com validade de ${expiryDays} dia(s)` : "Token gerado sem expiracao automatica");
      addLog(`Token gerado (${scopeProfiles[scopeProfile].label})`);
    } catch (error) {
      const message = formatApiError(error);
      setStatusMessage(`Falha ao gerar token: ${message}`);
      addLog(`Erro ao gerar token: ${message}`);
    }
  }

  async function validateCurrentServiceKey() {
    if (!serviceKey.trim()) {
      setServiceKeyStatus("Informe uma Service Key antes de validar");
      return;
    }
    try {
      const result = await validateServiceKey(serviceKey);
      if (result?.data?.valid) {
        setServiceKeyStatus("Conectado com sucesso");
        setStatusMessage("Conectado com sucesso");
      } else {
        setServiceKeyStatus("Token invalido, expirado ou revogado");
      }
    } catch (error) {
      setServiceKeyStatus(`Falha na validacao: ${formatApiError(error)}`);
    }
  }

  async function removeAllListedTokens() {
    if (!tokens.length) {
      setStatusMessage("Nao existem tokens para remover");
      return;
    }
    try {
      await revokeAllTokens(tokens.map((token) => token.id));
      await refreshTokens();
      setSelectedTokenId("");
      setServiceKeyStatus("Token revogado. Gere ou valide uma nova key.");
      setStatusMessage("Todos os tokens listados foram revogados");
    } catch (error) {
      setStatusMessage(`Falha ao revogar tokens: ${formatApiError(error)}`);
    }
  }

  function requestRevokeToken(token: TokenRow) {
    setRevokeConfirm({ id: token.id, name: token.name });
    setRevokeConfirmInput("");
  }

  async function confirmRevokeToken() {
    if (!revokeConfirm) return;
    try {
      await revokeToken(revokeConfirm.id);
      setTokens((prev) => prev.filter((t) => t.id !== revokeConfirm.id));
      if (selectedTokenId === revokeConfirm.id) setSelectedTokenId("");
      setServiceKeyStatus("Token revogado. Gere ou valide uma nova key.");
      setStatusMessage(`Token "${revokeConfirm.name}" revogado e removido`);
      addLog(`Token "${revokeConfirm.name}" revogado`);
      setRevokeConfirm(null);
      setRevokeConfirmInput("");
    } catch (error) {
      setStatusMessage(`Falha ao revogar token: ${formatApiError(error)}`);
    }
  }

  async function generateTestIds() {
    try {
      const response = await bootstrapTestIds();
      setTestIds(response.data);
      addLog("IDs de teste criados com sucesso");
      setStatusMessage("IDs de teste gerados e prontos para uso");
    } catch (error) {
      const message = formatApiError(error);
      addLog(`Falha ao gerar IDs: ${message}`);
      setStatusMessage(`Falha ao gerar IDs: ${message}`);
    }
  }

  async function refreshHealth() {
    try {
      const result = await fetchServiceHealth();
      const online = Object.values(result).filter((item) => item?.success).length;
      addLog(`Health check: ${online}/5 servicos online`);
    } catch {
      addLog("Health check: erro ao consultar servicos");
    }
  }

  async function loadDocs() {
    try {
      const response = await fetchGatewayDocs();
      setDocs(response.data?.endpoints ?? []);
    } catch {
      setDocs([]);
    }
  }

  async function submitSignature() {
    if (!idsReady) {
      setStatusMessage("Crie os IDs de teste antes de enviar");
      return;
    }

    if (signatureMode === "digitar") {
      if (!signatureText.trim()) {
        setStatusMessage("Digite um nome para gerar a assinatura tipografica.");
        return;
      }
    } else {
      if (!signatureBase64) {
        setStatusMessage("Assinatura vazia. Desenhe para gerar o desenho.");
        return;
      }
    }

    try {
      let result: { data?: { id?: string; path?: string; hash?: string; ip?: string; capturedAt?: string } };
      if (signatureMode === "digitar") {
        result = await salvarAssinaturaTipografica({
          signatoryId: testIds.signatoryId,
          documentId: testIds.documentId,
          text: signatureText.trim(),
          userAgent: navigator.userAgent,
          ...(geoCoords && { latitude: geoCoords.latitude, longitude: geoCoords.longitude })
        });
      } else {
        result = await salvarAssinatura({
          signatoryId: testIds.signatoryId,
          documentId: testIds.documentId,
          imageBase64: signatureBase64,
          userAgent: navigator.userAgent,
          ...(geoCoords && { latitude: geoCoords.latitude, longitude: geoCoords.longitude })
        });
      }

      const info = result?.data;
      const detail = info?.id ? ` | id: ${info.id}` : "";
      const pathDetail = info?.path ? ` | path: ${info.path}` : "";
      setStatusMessage(`Assinatura enviada com sucesso${detail}${pathDetail}`);
      addLog(`Assinatura ${signatureMode === "digitar" ? "tipografica" : "manual"} registrada${detail}`);
    } catch (error) {
      const message = formatApiError(error);
      setStatusMessage(`Falha ao enviar assinatura: ${message}`);
      addLog(`Erro no envio da assinatura: ${message}`);
    }
  }

  function resetDocumentFlow() {
    setFrontDocumentBase64("");
    setBackDocumentBase64("");
    goToDocFlowStep("select");
  }

  function selectDocumentType(nextType: string) {
    setDocType(nextType);
    setFrontDocumentBase64("");
    setBackDocumentBase64("");
    goToDocFlowStep("front");
    setStatusMessage("Tipo selecionado. Agora capture a foto da frente.");
  }

  async function submitDocumentFlow() {
    if (!idsReady) {
      setStatusMessage("Crie os IDs de teste antes de enviar");
      return;
    }
    if (!frontDocumentBase64) {
      setStatusMessage("Capture a frente do documento antes de enviar");
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        signatoryId: testIds.signatoryId,
        documentId: testIds.documentId,
        imageFrenteBase64: frontDocumentBase64,
        type: docType,
        userAgent: navigator.userAgent,
        ...(geoCoords && { latitude: geoCoords.latitude, longitude: geoCoords.longitude })
      };
      if (needsBack && backDocumentBase64) {
        payload.imageVersoBase64 = backDocumentBase64;
      }
      const result = await uploadDocumentoCombinado(payload) as { data?: { id?: string; path?: string; address?: string; capturedAt?: string } };
      const info = result?.data;
      const detail = info?.id ? ` | id: ${info.id}` : "";
      const pathDetail = info?.path ? ` | path: ${info.path}` : "";
      setStatusMessage(`Documento salvo com sucesso${detail}${pathDetail}`);
      addLog(`Documento ${docType.toUpperCase()} (frente${needsBack && backDocumentBase64 ? " + verso" : ""}) salvo${detail}`);
    } catch (error) {
      const message = formatApiError(error);
      setStatusMessage(`Falha ao enviar documento: ${message}`);
      addLog(`Erro no envio de documento: ${message}`);
    }
  }

  async function verifySelfieWithBluepoint() {
    if (!selfieApiToken.trim()) {
      setSelfieApiStatus("Informe o token JWT/API Key da BluePoint");
      return;
    }
    if (!selfieBase64) {
      setSelfieApiStatus("Capture a selfie antes de verificar");
      return;
    }

    try {
      const result = await verifyBluepointFace({
        token: selfieApiToken,
        imagem: selfieBase64,
        baseUrl: selfieApiUrl
      });
      if (result?.success) {
        setSelfieApiStatus("Conectado com sucesso");
      } else {
        setSelfieApiStatus(`BluePoint retornou HTTP ${result?.status ?? 0}`);
      }
      setBluepointResult(JSON.stringify(result?.data ?? result, null, 2));
      addLog("Consulta BluePoint /biometria/verificar-face executada");
    } catch (error) {
      setSelfieApiStatus(`Erro ao testar conexao: ${formatApiError(error)}`);
    }
  }

  async function submitSelfieDoc() {
    if (!idsReady) {
      setStatusMessage("Crie os IDs de teste antes de enviar");
      return;
    }
    if (!selfieDocBase64) {
      setStatusMessage("Capture a selfie com documento antes de enviar");
      return;
    }

    try {
      await capturarSelfieDocumento({
        signatoryId: testIds.signatoryId,
        documentId: testIds.documentId,
        imageBase64: selfieDocBase64,
        userAgent: navigator.userAgent,
        ...(geoCoords && { latitude: geoCoords.latitude, longitude: geoCoords.longitude })
      });
      setStatusMessage("Selfie + documento enviada com sucesso");
      addLog("Selfie+Documento registrado com sucesso");
    } catch (error) {
      const message = formatApiError(error);
      setStatusMessage(`Falha ao enviar selfie+documento: ${message}`);
      addLog(`Erro no envio de selfie+documento: ${message}`);
    }
  }

  function handleSelfieCaptured(base64: string) {
    setSelfieBase64(base64);
    if (base64) {
      setStatusMessage("Captura de selfie realizada com sucesso.");
      addLog("Selfie capturada com sucesso.");
    }
  }

  function handleSelfieDocCaptured(base64: string) {
    setSelfieDocBase64(base64);
    if (base64) {
      setStatusMessage("Captura de selfie com documento realizada com sucesso.");
      addLog("Selfie+documento capturada com sucesso.");
    }
  }

  async function copyText(label: string, value: string) {
    if (!value) {
      setStatusMessage(`Nada para copiar em ${label}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setStatusMessage(`${label} copiado para area de transferencia`);
    } catch {
      setStatusMessage("Nao foi possivel copiar automaticamente");
    }
  }

  useEffect(() => {
    refreshTokens().catch(() => addLog("Falha ao carregar tokens"));
    loadDocs().catch(() => addLog("Falha ao carregar docs"));
    refreshHealth().catch(() => addLog("Falha no health check inicial"));
    const timer = setInterval(() => {
      refreshHealth().catch(() => addLog("Falha no health check"));
    }, 20000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          addLog(`Geolocalizacao GPS obtida: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        () => addLog("Geolocalizacao GPS nao disponivel — usando IP como fallback"),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth <= 768) return;

    const entrySelectors = [
      ".wizard-card",
      ".token-kpi",
      ".side-section",
      ".tab-btn",
      ".chip",
      ".doc-type-card",
      ".module-view-controls"
    ].join(", ");

    const entryElements = Array.from(document.querySelectorAll(entrySelectors)) as HTMLElement[];
    gsap.fromTo(entryElements, { y: 8, opacity: 0.92 }, { y: 0, opacity: 1, duration: 0.34, stagger: 0.006, ease: "power2.out", overwrite: "auto" });

    const hoverSelectors = [
      ".button",
      ".tab-btn",
      ".doc-type-card",
      ".token-item-content",
      ".mode-btn"
    ].join(", ");
    const hoverElements = Array.from(document.querySelectorAll(hoverSelectors)) as HTMLElement[];

    const cleanups: Array<() => void> = [];
    hoverElements.forEach((el) => {
      const isButton = el.classList.contains("button") || el.classList.contains("tab-btn");
      const scaleHover = isButton ? 1.03 : 1.015;

      const onEnter = () => gsap.to(el, { scale: scaleHover, duration: 0.22, ease: "power2.out" });
      const onLeave = () => gsap.to(el, { scale: 1, duration: 0.27, ease: "power2.out" });

      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [activeTab]);

  function renderModuleViewControls() {
    return (
      <div className="module-view-controls">
        <div className="small-text">Modo de visualizacao — simule como o usuario final enxerga o componente</div>
        <div className="row mode-btn-row">
          <button
            className={`button button-secondary mode-btn ${activeExecutionView === "normal" ? "active" : ""}`}
            onClick={() => setModuleExecutionView((prev) => ({ ...prev, [activeTab]: "normal" }))}
          >
            <span className="mode-btn-icon" aria-hidden="true">◻</span>
            <span>NORMAL</span>
          </button>
          <button
            className={`button button-secondary mode-btn ${activeExecutionView === "pc" ? "active" : ""}`}
            onClick={() => setModuleExecutionView((prev) => ({ ...prev, [activeTab]: "pc" }))}
          >
            <span className="mode-btn-icon" aria-hidden="true">🖥</span>
            <span>PC</span>
          </button>
          <button
            className={`button button-secondary mode-btn ${activeExecutionView === "celular" ? "active" : ""}`}
            onClick={() => setModuleExecutionView((prev) => ({ ...prev, [activeTab]: "celular" }))}
          >
            <span className="mode-btn-icon" aria-hidden="true">📱</span>
            <span>CELULAR</span>
          </button>
        </div>
      </div>
    );
  }

  function renderProcessViewport(children: ReactNode) {
    if (executionViewForRender === "normal") {
      return (
        <div className="device-shell-plain">
          <div className="preview-stage plain">
            <div className="module-runtime-content">{children}</div>
          </div>
        </div>
      );
    }

    const isDesktop = executionViewForRender === "pc";

    return (
      <div className="device-viewport-wrapper">
        <div className={`device-frame ${isDesktop ? "device-frame-desktop" : "device-frame-mobile"}`}>
          {!isDesktop && (
            <>
              <span className="shell-notch" />
              <span className="shell-camera-dot" />
              <span className="shell-btn shell-btn-1" />
              <span className="shell-btn shell-btn-2" />
              <span className="shell-home-indicator" />
            </>
          )}
          {isDesktop && (
            <>
              <span className="shell-screen-gloss" />
              <div className="device-frame-desktop-stand" />
              <div className="device-frame-desktop-base" />
            </>
          )}
          <div className="device-frame-screen">
            <div className="module-runtime-content">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-root">
      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">BLUETECH SIGN API</div>
        <div className="brand-subtitle">Central visual de integração para assinatura, documento e selfie.</div>

        <div className="side-section">
          <div className="side-title-row">
            <div className="side-title">SERVICE KEY (PARA TESTES)</div>
            <span
              className="help-dot"
              title="Use a Service Key para autenticar chamadas nos microservicos. Valide aqui antes de testar os fluxos."
            >
              ?
            </span>
          </div>
          <div className="small-text side-helper-text">
            Cole a chave de acesso e valide. Se estiver invalida, expirada ou revogada, o status fica vermelho.
          </div>
          <input
            className="input"
            value={serviceKey}
            onChange={(e) => {
              const value = e.target.value;
              setKey(value);
              setServiceKey(value);
            }}
            placeholder="bt_live_xxxxx"
          />
          <div className="row side-actions">
            <button className="button" onClick={() => void validateCurrentServiceKey()}>
              VALIDAR TOKEN
            </button>
            <button className="button button-secondary" onClick={() => void copyText("Service key", serviceKey)}>
              COPIAR KEY
            </button>
          </div>
          <div className={serviceKeyStatusClass}>{serviceKeyStatus}</div>
        </div>

        <div className="side-section">
          <div className="side-title-row">
            <div className="side-title">IDS DE TESTE</div>
            <span
              className="help-dot"
              title="signatoryId identifica o assinante e documentId identifica o documento. Eles vinculam assinatura, documento e selfie no mesmo processo."
            >
              ?
            </span>
          </div>
          <div className="small-text side-helper-text">
            Os IDs conectam todos os modulos no mesmo ciclo. Gere automatico ou informe manualmente para simular seu sistema real.
          </div>
          <button className="button button-secondary side-full-button" onClick={() => void generateTestIds()}>GERAR IDS</button>
          <input
            className="input"
            value={testIds.signatoryId}
            onChange={(e) => setTestIds((prev) => ({ ...prev, signatoryId: e.target.value }))}
            placeholder="signatoryId manual"
          />
          <input
            className="input"
            value={testIds.documentId}
            onChange={(e) => setTestIds((prev) => ({ ...prev, documentId: e.target.value }))}
            placeholder="documentId manual"
          />
          <div className="id-preview">
            <div className="small-text"><strong>signatoryId:</strong> {testIds.signatoryId || "-"}</div>
            <div className="small-text"><strong>documentId:</strong> {testIds.documentId || "-"}</div>
          </div>
        </div>

        <div className="side-section">
          <div className="side-title">LOG DE OPERACOES</div>
          <div className="log-box">
            {logs.map((line) => (
              <div key={line} className="log-line">{line}</div>
            ))}
          </div>
          <div className="small-text">Health checks OK: {healthCount}</div>
        </div>
      </aside>

      <main className="main">
        <div className="tab-row">
          {tabs.map((tab) => (
            <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? "active" : ""}`} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="card">
          {activeTab === "tokens" && (
            <>
              <h2>GERENCIAMENTO DE TOKENS DE API</h2>
              <MagicBento
                cards={[
                  {
                    title: "Criar Token",
                    description: "Defina nome, escopos e validade para o ambiente.",
                    label: "Passo 1"
                  },
                  {
                    title: "Validar Service Key",
                    description: "Teste o token e confirme conexao ativa.",
                    label: "Passo 2"
                  },
                  {
                    title: "Executar Modulos",
                    description: "Use assinatura, documento e selfie com o mesmo ciclo.",
                    label: "Passo 3"
                  },
                  {
                    title: "Rotacionar Token",
                    description: "Revogue e gere um novo token para manter seguranca.",
                    label: "Passo 4"
                  }
                ]}
              />
              <div className="token-kpis">
                <div className="token-kpi"><strong>{activeTokenCount}</strong><span>Tokens ativos</span></div>
                <div className="token-kpi"><strong>{selectedScopeCount}</strong><span>Escopos do perfil</span></div>
                <div className="token-kpi"><strong>{uniqueScopeCount}</strong><span>Escopos em uso</span></div>
              </div>

              <div className="wizard-card">
                <h3>Criar novo token</h3>
                <div className="small-text">Selecione o perfil de permissao e configure a vigencia. <span title="A validade define ate quando o token permanece aceito. Sem validade, ele funciona ate ser revogado manualmente.">ℹ</span></div>
                <div className="row">
                  <select className="input" value={scopeProfile} onChange={(e) => setScopeProfile(e.target.value as ScopeProfileKey)}>
                    {Object.entries(scopeProfiles).map(([key, profile]) => (
                      <option key={key} value={key}>{profile.label}</option>
                    ))}
                  </select>
                </div>
                <div className="row">
                  <input className="input" value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="Nome do token (ex.: App Producao)" />
                  <input
                    className="input"
                    value={expiresInDaysInput}
                    onChange={(e) => setExpiresInDaysInput(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Validade em dias (vazio = sem expiracao)"
                  />
                  <button className="button" onClick={() => void generateToken()}>GERAR TOKEN</button>
                </div>
                <div className="small-text">Perfil selecionado: {scopeProfiles[scopeProfile].label}</div>
              </div>

              {!!lastToken && (
                <div className="wizard-card token-highlight">
                  <h3>Token gerado agora</h3>
                  <div className="token-preview-row">
                    <code className="token-preview-value">{lastToken}</code>
                    <button className="button button-secondary" onClick={() => void copyText("Token gerado", lastToken)}>COPIAR TOKEN</button>
                  </div>
                  <div className="small-text">Guarde este valor com seguranca. Depois de revogar, ele deixa de funcionar.</div>
                </div>
              )}

              <div className="wizard-card">
                <h3>Tokens cadastrados</h3>
                <div className="small-text">Gerencie os tokens ativos. Clique em "Mostrar lista" para visualizar, selecionar detalhes ou revogar individualmente.</div>
                <div className="row">
                  <button className="button button-secondary" onClick={() => { setShowTokenList((prev) => !prev); if (!showTokenList) void refreshTokens(); }}>
                    {showTokenList ? "OCULTAR LISTA" : "MOSTRAR LISTA"}
                  </button>
                  <button className="button button-secondary" onClick={() => void refreshTokens()}>ATUALIZAR</button>
                </div>
              </div>

              {showTokenList && (
                <div className="token-list">
                  <AnimatedList
                    items={tokens}
                    onItemSelect={(token) => setSelectedTokenId(token.id)}
                    showGradients
                    enableArrowNavigation
                    displayScrollbar
                    initialSelectedIndex={selectedTokenIndex}
                    getItemKey={(token) => token.id}
                    itemClassName="token-animated-item"
                    renderItem={(token) => (
                      <div className={`token-item-content ${token.is_active === false ? "token-item-revoked" : ""}`}>
                        <div className="token-item-head">
                          <div className="token-name">{token.name}</div>
                          <div className="row token-actions-row">
                            <button
                              className="button button-secondary button-sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedTokenId(token.id);
                              }}
                            >
                              Detalhes
                            </button>
                            {token.is_active !== false && (
                              <button
                                className="button button-danger button-sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  requestRevokeToken(token);
                                }}
                              >
                                Revogar
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="small-text token-scopes-line">{(token.scopes ?? []).join(", ")}</div>
                        <div className="small-text">{getTokenValidityLabel(token)}</div>
                      </div>
                    )}
                  />
                  {!tokens.length && <div className="small-text">Nenhum token cadastrado no momento.</div>}
                </div>
              )}

              {revokeConfirm && (
                <div className="revoke-modal-overlay" onClick={() => setRevokeConfirm(null)}>
                  <div className="revoke-modal" onClick={(e) => e.stopPropagation()}>
                    <h3>Confirmar revogacao</h3>
                    <div className="small-text">
                      Para revogar o token <strong>"{revokeConfirm.name}"</strong>, digite o nome exato abaixo para confirmar. Esta acao e irreversivel.
                    </div>
                    <input
                      className="input"
                      value={revokeConfirmInput}
                      onChange={(e) => setRevokeConfirmInput(e.target.value)}
                      placeholder={`Digite: ${revokeConfirm.name}`}
                      autoFocus
                    />
                    <div className="row revoke-modal-actions">
                      <button className="button button-secondary" onClick={() => setRevokeConfirm(null)}>CANCELAR</button>
                      <button
                        className="button button-danger"
                        disabled={revokeConfirmInput !== revokeConfirm.name}
                        onClick={() => void confirmRevokeToken()}
                      >
                        CONFIRMAR REVOGACAO
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedToken && (
                <div className="wizard-card">
                  <h3>Detalhes do token selecionado</h3>
                  <div className="small-text">Nome: {selectedToken.name}</div>
                  <div className={selectedToken.is_active === false ? "status-danger" : "status-ok"}>
                    Status: {selectedToken.is_active === false ? "Inativo / Revogado" : "Ativo"}
                  </div>
                  <div className="small-text">Criado em: {formatDateLabel(selectedToken.created_at)}</div>
                  <div className="small-text">Ultimo uso: {formatDateLabel(selectedToken.last_used_at)}</div>
                  <div className="small-text">Vigencia: {getTokenValidityLabel(selectedToken)}</div>
                  <div className="small-text">ID interno: {selectedToken.id}</div>
                </div>
              )}
              <div className="small-text">
                Vigencia dos tokens: com "Validade em dias", o token expira automaticamente; sem esse campo, o token permanece valido ate voce revogar.
              </div>
            </>
          )}

          {activeTab === "assinatura" && (
            <>
              {renderModuleViewControls()}
              {renderProcessViewport(
                <>
                  <h2>CAPTURA DE ASSINATURA</h2>
                  <div className="small-text">Escolha o modo de captura. O desenho manual e o padrao recomendado. No modo digitar, o texto e convertido automaticamente em assinatura cursiva.</div>
                  <div className="row sig-mode-row">
                    <button className={`button button-secondary sig-mode-btn ${signatureMode === "desenhar" ? "active" : ""}`} onClick={() => setSignatureMode("desenhar")}>DESENHAR</button>
                    <button className={`button button-secondary sig-mode-btn ${signatureMode === "digitar" ? "active" : ""}`} onClick={() => setSignatureMode("digitar")}>DIGITAR</button>
                  </div>

                  {signatureMode === "desenhar" ? (
                    <SignatureCanvas onChange={setSignatureBase64} />
                  ) : (
                    <>
                      <input className="input" value={signatureText} onChange={(e) => setSignatureText(e.target.value)} placeholder="Digite seu nome completo" />
                      <TypedSignatureCanvas text={signatureText} onChange={setSignatureBase64} />
                      <div className="small-text">A assinatura tipografica sera convertida em imagem automaticamente.</div>
                    </>
                  )}

                  <button className="button sig-submit-btn" onClick={() => void submitSignature()}>ENVIAR ASSINATURA</button>
                </>
              )}
            </>
          )}

          {activeTab === "documento" && (
            <>
              {renderModuleViewControls()}
              {renderProcessViewport(
                <>
                  <h2>CAPTURA DE DOCUMENTO</h2>

                  <div className="doc-step-indicator">
                    <div className={`doc-step ${docFlowStep === "select" ? "active" : "done"}`}>
                      <span className="doc-step-num">1</span><span className="doc-step-label">Tipo</span>
                    </div>
                    <div className="doc-step-line" />
                    <div className={`doc-step ${docFlowStep === "front" ? "active" : (["back", "review"].includes(docFlowStep) ? "done" : "")}`}>
                      <span className="doc-step-num">2</span><span className="doc-step-label">Frente</span>
                    </div>
                    {needsBack && <>
                      <div className="doc-step-line" />
                      <div className={`doc-step ${docFlowStep === "back" ? "active" : (docFlowStep === "review" ? "done" : "")}`}>
                        <span className="doc-step-num">3</span><span className="doc-step-label">Verso</span>
                      </div>
                    </>}
                    <div className="doc-step-line" />
                    <div className={`doc-step ${docFlowStep === "review" ? "active" : ""}`}>
                      <span className="doc-step-num">{needsBack ? "4" : "3"}</span><span className="doc-step-label">Enviar</span>
                    </div>
                  </div>
                  {docBackStepCueVisible && (
                    <div className="doc-back-step-cue" role="status" aria-live="polite">
                      ✅ Frente salva. Agora tire a foto do <strong>VERSO</strong>.
                    </div>
                  )}

                  {docFlowStep === "select" && (
                    <div className="wizard-card" key="step-select">
                      <div className="small-text">Selecione o tipo de documento para iniciar a captura.</div>
                      <div className="doc-type-grid">
                        {docTypeOptions.map((option) => (
                          <button
                            key={option.value}
                            className={`doc-type-card ${docType === option.value ? "active" : ""}`}
                            onClick={() => selectDocumentType(option.value)}
                            type="button"
                          >
                            <div className="doc-type-icon">{option.icon}</div>
                            <div className="doc-type-badge">{option.badge}</div>
                            <div className="doc-type-title">{option.label}</div>
                            <div className="doc-type-subtitle">{option.subtitle}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {docFlowStep === "front" && (
                    <div className="wizard-card" key="step-front">
                      <div className="small-text">Passo 2 de {needsBack ? "4" : "3"}: capture ou anexe a foto da <strong>FRENTE</strong> do {docType.toUpperCase()}.</div>
                      <CameraCapture
                        mode="document"
                        onCapture={(b64) => {
                          setFrontDocumentBase64(b64);
                          if (b64) {
                            setStatusMessage("Frente capturada. Avancando...");
                            setTimeout(() => goToDocFlowStep(needsBack ? "back" : "review"), 600);
                          }
                        }}
                        documentType={docType}
                        side="front"
                        allowFileUpload
                        onValidation={setDocValidation}
                      />
                      <div className="row">
                        <button className="button button-secondary" onClick={() => goToDocFlowStep("select")}>VOLTAR</button>
                        <button className="button" disabled={!frontDocumentBase64} onClick={() => goToDocFlowStep(needsBack ? "back" : "review")}>PROXIMO PASSO</button>
                      </div>
                    </div>
                  )}

                  {docFlowStep === "back" && (
                    <div className="wizard-card" key="step-back">
                      <div className="small-text">Passo 3 de 4: capture ou anexe a foto do <strong>VERSO</strong> do {docType.toUpperCase()}.</div>
                      <CameraCapture
                        mode="document"
                        onCapture={(b64) => {
                          setBackDocumentBase64(b64);
                          if (b64) {
                            setStatusMessage("Verso capturado. Avancando para revisao...");
                            setTimeout(() => goToDocFlowStep("review"), 600);
                          }
                        }}
                        documentType={docType}
                        side="back"
                        allowFileUpload
                        onValidation={setDocValidation}
                      />
                      <div className="row">
                        <button className="button button-secondary" onClick={() => goToDocFlowStep("front")}>VOLTAR</button>
                        <button className="button" disabled={!backDocumentBase64} onClick={() => goToDocFlowStep("review")}>REVISAR</button>
                      </div>
                    </div>
                  )}

                  {docFlowStep === "review" && (
                    <div className="wizard-card" key="step-review">
                      <div className="small-text">Passo {needsBack ? "4 de 4" : "3 de 3"}: confirme as capturas do <strong>{docType.toUpperCase()}</strong>. Frente{needsBack ? " e verso serao combinados" : " sera salva"} em <strong>um unico PNG</strong> com rodape de IP, geolocalizacao, data/hora e user-agent.</div>
                      <div className="doc-review-grid">
                        <div className="doc-review-item">
                          <div className="doc-review-label">Frente</div>
                          {frontDocumentBase64 ? <img src={frontDocumentBase64} alt="frente" className="doc-review-thumb" /> : <div className="doc-review-pending">Pendente</div>}
                        </div>
                        {needsBack && (
                          <div className="doc-review-item">
                            <div className="doc-review-label">Verso</div>
                            {backDocumentBase64
                              ? <img src={backDocumentBase64} alt="verso" className="doc-review-thumb" />
                              : <div className="doc-review-pending">Opcional — não capturado</div>}
                          </div>
                        )}
                      </div>
                      <div className="doc-combined-info">
                        <span className="doc-combined-icon">🗂️</span>
                        <span>Tipo: <strong>{docType.toUpperCase()}</strong> · Arquivo único · Metadados: IP, geolocalização, data/hora BRT, user-agent</span>
                      </div>
                      <div className="row">
                        <button className="button button-secondary" onClick={() => goToDocFlowStep(needsBack ? "back" : "front")}>VOLTAR</button>
                        <button className="button sig-submit-btn" disabled={!frontDocumentBase64} onClick={() => void submitDocumentFlow()}>FINALIZAR E ENVIAR</button>
                      </div>
                      <button className="button button-secondary" style={{ marginTop: "6px", width: "100%" }} onClick={resetDocumentFlow}>REINICIAR FLUXO</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === "selfie" && (
            <>
              {renderModuleViewControls()}
              {renderProcessViewport(
                <>
                  <h2>SELFIE BIOMETRICA</h2>
                  <div className="small-text">
                    Capture sua selfie com a camera frontal. A imagem sera salva com metadados de registro (IP, localizacao, data/hora).
                  </div>
                  <CameraCapture mode="selfie" onCapture={handleSelfieCaptured} allowFileUpload={false} onValidation={setSelfieValidation} />

                  <div className="wizard-card">
                    <h3>Integracao BluePoint</h3>
                    <div className="small-text">
                      Endpoint: <code>POST /api/v1/biometria/verificar-face</code> — Envia a selfie para verificacao biometrica.
                    </div>
                    <a className="small-text" href="https://bluepoint-api.bluetechfilms.com.br/docs/biometria" target="_blank" rel="noreferrer">
                      Documentacao oficial BluePoint
                    </a>
                    <input className="input" value={selfieApiUrl} onChange={(e) => setSelfieApiUrl(e.target.value)} placeholder="URL da API BluePoint" />
                    <input className="input" value={selfieApiToken} onChange={(e) => setSelfieApiToken(e.target.value)} placeholder="Token JWT ou API Key" />
                    <div className="row">
                      <button className="button sig-submit-btn" onClick={() => void verifySelfieWithBluepoint()}>
                        VERIFICAR FACE
                      </button>
                    </div>
                    <div className={selfieApiStatus.toLowerCase().includes("sucesso") ? "status-ok" : "status-warn"}>{selfieApiStatus}</div>
                    {bluepointResult && <textarea className="input" rows={6} readOnly value={bluepointResult} />}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === "selfieDoc" && (
            <>
              {renderModuleViewControls()}
              {renderProcessViewport(
                <>
                  <h2>SELFIE COM DOCUMENTO</h2>
                  <div className="small-text">
                    Posicione seu rosto no circulo superior e o documento no retangulo inferior. A camera identifica ambos automaticamente.
                  </div>
                  <div className="selfie-doc-guide-info">
                    <div className="guide-info-item">
                      <span className="guide-info-icon">&#9898;</span>
                      <span>Rosto centralizado no circulo</span>
                    </div>
                    <div className="guide-info-item">
                      <span className="guide-info-icon">&#9634;</span>
                      <span>Documento visivel no retangulo</span>
                    </div>
                  </div>
                  <CameraCapture mode="selfieDoc" onCapture={handleSelfieDocCaptured} allowFileUpload={false} onValidation={setSelfieDocValidation} />
                  <button className="button sig-submit-btn" disabled={!selfieDocBase64} onClick={() => void submitSelfieDoc()}>ENVIAR CAPTURA</button>
                </>
              )}
            </>
          )}

          {activeTab === "docs" && (
            <>
              <h2>DOCUMENTACAO E DOWNLOADS</h2>
              <div className="wizard-card">
                <h3>Guia de integracao</h3>
                <div className="small-text">1) Gere e valide token.</div>
                <div className="small-text">2) Gere IDs de teste.</div>
                <div className="small-text">3) Teste assinatura, documento, selfie e selfie+doc.</div>
                <div className="small-text">4) Baixe o kit e incorpore no projeto.</div>
              </div>

              <div className="wizard-card">
                <h3>Downloads por interface</h3>
                <div className="row">
                  <a className="button" href="/downloads/bluetech-sign-react-kit.zip" download>BAIXAR KIT ASSINATURA</a>
                  <a className="button" href="/downloads/bluetech-sign-react-kit.zip" download>BAIXAR KIT DOCUMENTO</a>
                  <a className="button" href="/downloads/bluetech-sign-react-kit.zip" download>BAIXAR KIT SELFIE</a>
                  <a className="button" href="/downloads/bluetech-sign-react-kit.zip" download>BAIXAR KIT SELFIE+DOC</a>
                </div>
                <div className="row">
                  <a className="button button-secondary" href="/downloads/bluetech-sign-integration-full.zip" download>
                    BAIXAR PACOTE COMPLETO (REACT + PYTHON)
                  </a>
                  <a className="button button-secondary" href="/downloads/bluetech-sign-react-kit-0.1.0.tgz" download>
                    BAIXAR PACOTE NPM (.tgz)
                  </a>
                </div>
                <div className="small-text">
                  Se o download falhar, recarregue a pagina e tente novamente. Os arquivos ficam em <code>/downloads</code>.
                </div>
              </div>

              <div className="wizard-card">
                <h3>Importar no projeto cliente</h3>
                <div className="small-text">Opcao 1 (manual): baixe o ZIP e extraia na pasta do seu projeto.</div>
                <div className="small-text">Opcao 2 (automatizada PowerShell):</div>
                <textarea
                  className="input"
                  rows={3}
                  readOnly
                  value={'powershell -ExecutionPolicy Bypass -File scripts/install-integration-kit.ps1 -TargetProjectPath "C:\\meu-projeto" -Mode full'}
                />
              </div>

              <div className="wizard-card">
                <h3>Endpoints ativos</h3>
                {docs.map((endpoint) => (
                  <div key={endpoint} className="small-text">{endpoint}</div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="status-bar">{statusMessage}</div>
      </main>
      </div>
    </div>
  );
}
