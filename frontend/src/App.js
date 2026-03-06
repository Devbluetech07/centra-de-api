import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { gsap } from "gsap";
import { bootstrapTestIds, capturarSelfieDocumento, createToken, fetchGatewayDocs, fetchServiceHealth, listTokens, revokeAllTokens, revokeToken, salvarAssinatura, salvarAssinaturaTipografica, setServiceKey, uploadDocumentoCombinado, validateServiceKey, verifyBluepointFace } from "./services/api";
import { CameraCapture } from "./components/CameraCapture";
import { SignatureCanvas } from "./components/SignatureCanvas";
import { TypedSignatureCanvas } from "./components/TypedSignatureCanvas";
import { AnimatedList } from "./components/AnimatedList";
import { MagicBento } from "./components/MagicBento";
const tabs = [
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
const scopeProfiles = {
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
function formatApiError(error) {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = error.response;
        if (response?.data?.message)
            return response.data.message;
    }
    if (error instanceof Error)
        return error.message;
    return "Erro inesperado";
}
export default function App() {
    const [activeTab, setActiveTab] = useState("tokens");
    const [moduleExecutionView, setModuleExecutionView] = useState({
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
    const [scopeProfile, setScopeProfile] = useState("full");
    const [tokens, setTokens] = useState([]);
    const [lastToken, setLastToken] = useState("");
    const [showTokenList, setShowTokenList] = useState(false);
    const [selectedTokenId, setSelectedTokenId] = useState("");
    const [revokeConfirm, setRevokeConfirm] = useState(null);
    const [revokeConfirmInput, setRevokeConfirmInput] = useState("");
    const [testIds, setTestIds] = useState({ orgId: "", documentId: "", signatoryId: "" });
    const [logs, setLogs] = useState([]);
    const [docs, setDocs] = useState([]);
    const [statusMessage, setStatusMessage] = useState("Sistema inicializado");
    const [geoCoords, setGeoCoords] = useState(null);
    const [signatureMode, setSignatureMode] = useState("desenhar");
    const [signatureBase64, setSignatureBase64] = useState("");
    const [signatureText, setSignatureText] = useState("");
    const [docType, setDocType] = useState("rg");
    const [docFlowStep, setDocFlowStep] = useState("select");
    const [docBackStepCueVisible, setDocBackStepCueVisible] = useState(false);
    const [frontDocumentBase64, setFrontDocumentBase64] = useState("");
    const [backDocumentBase64, setBackDocumentBase64] = useState("");
    const [docValidation, setDocValidation] = useState({ canCapture: false, feedback: "Aguardando camera" });
    const [selfieBase64, setSelfieBase64] = useState("");
    const [selfieValidation, setSelfieValidation] = useState({ canCapture: false, feedback: "Aguardando camera" });
    const [selfieApiUrl, setSelfieApiUrl] = useState("https://bluepoint-api.bluetechfilms.com.br");
    const [selfieApiToken, setSelfieApiToken] = useState("");
    const [selfieApiStatus, setSelfieApiStatus] = useState("API BluePoint nao validada");
    const [bluepointResult, setBluepointResult] = useState("");
    const [selfieDocBase64, setSelfieDocBase64] = useState("");
    const [selfieDocValidation, setSelfieDocValidation] = useState({ canCapture: false, feedback: "Aguardando camera" });
    const healthCount = useMemo(() => logs.filter((line) => line.toLowerCase().includes("health check") && line.includes("5/5")).length, [logs]);
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
    const executionViewForRender = isProcessTab ? activeExecutionView : "normal";
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
    function goToDocFlowStep(nextStep) {
        setDocFlowStep(nextStep);
        if (nextStep === "back") {
            setStatusMessage("Agora tire a foto do VERSO do documento.");
        }
    }
    function addLog(message) {
        const timestamp = new Date().toLocaleTimeString("pt-BR", { timeZone: BRASILIA_TIMEZONE, hour12: false });
        setLogs((prev) => [`${timestamp}  ${message}`, ...prev].slice(0, 80));
    }
    function formatDateLabel(value) {
        if (!value)
            return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
            return "-";
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
    function getTokenValidityLabel(token) {
        if (!token.expires_at)
            return "Sem expiracao automatica (vigente ate revogacao manual)";
        const expiresDate = new Date(token.expires_at);
        if (Number.isNaN(expiresDate.getTime()))
            return "Validade indefinida";
        if (expiresDate.getTime() < Date.now())
            return `Expirado em ${formatDateLabel(token.expires_at)}`;
        return `Vigente ate ${formatDateLabel(token.expires_at)}`;
    }
    async function refreshTokens() {
        try {
            const response = await listTokens();
            setTokens(response.data ?? []);
        }
        catch (error) {
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
            const token = response.data.token;
            setLastToken(token);
            setKey(token);
            setServiceKey(token);
            setSelectedTokenId(response.data.id);
            setShowTokenList(true);
            await refreshTokens();
            setStatusMessage(expiryDays ? `Token gerado com validade de ${expiryDays} dia(s)` : "Token gerado sem expiracao automatica");
            addLog(`Token gerado (${scopeProfiles[scopeProfile].label})`);
        }
        catch (error) {
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
            }
            else {
                setServiceKeyStatus("Token invalido, expirado ou revogado");
            }
        }
        catch (error) {
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
        }
        catch (error) {
            setStatusMessage(`Falha ao revogar tokens: ${formatApiError(error)}`);
        }
    }
    function requestRevokeToken(token) {
        setRevokeConfirm({ id: token.id, name: token.name });
        setRevokeConfirmInput("");
    }
    async function confirmRevokeToken() {
        if (!revokeConfirm)
            return;
        try {
            await revokeToken(revokeConfirm.id);
            setTokens((prev) => prev.filter((t) => t.id !== revokeConfirm.id));
            if (selectedTokenId === revokeConfirm.id)
                setSelectedTokenId("");
            setServiceKeyStatus("Token revogado. Gere ou valide uma nova key.");
            setStatusMessage(`Token "${revokeConfirm.name}" revogado e removido`);
            addLog(`Token "${revokeConfirm.name}" revogado`);
            setRevokeConfirm(null);
            setRevokeConfirmInput("");
        }
        catch (error) {
            setStatusMessage(`Falha ao revogar token: ${formatApiError(error)}`);
        }
    }
    async function generateTestIds() {
        try {
            const response = await bootstrapTestIds();
            setTestIds(response.data);
            addLog("IDs de teste criados com sucesso");
            setStatusMessage("IDs de teste gerados e prontos para uso");
        }
        catch (error) {
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
        }
        catch {
            addLog("Health check: erro ao consultar servicos");
        }
    }
    async function loadDocs() {
        try {
            const response = await fetchGatewayDocs();
            setDocs(response.data?.endpoints ?? []);
        }
        catch {
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
        }
        else {
            if (!signatureBase64) {
                setStatusMessage("Assinatura vazia. Desenhe para gerar o desenho.");
                return;
            }
        }
        try {
            let result;
            if (signatureMode === "digitar") {
                result = await salvarAssinaturaTipografica({
                    signatoryId: testIds.signatoryId,
                    documentId: testIds.documentId,
                    text: signatureText.trim(),
                    userAgent: navigator.userAgent,
                    ...(geoCoords && { latitude: geoCoords.latitude, longitude: geoCoords.longitude })
                });
            }
            else {
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
        }
        catch (error) {
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
    function selectDocumentType(nextType) {
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
            const payload = {
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
            const result = await uploadDocumentoCombinado(payload);
            const info = result?.data;
            const detail = info?.id ? ` | id: ${info.id}` : "";
            const pathDetail = info?.path ? ` | path: ${info.path}` : "";
            setStatusMessage(`Documento salvo com sucesso${detail}${pathDetail}`);
            addLog(`Documento ${docType.toUpperCase()} (frente${needsBack && backDocumentBase64 ? " + verso" : ""}) salvo${detail}`);
        }
        catch (error) {
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
            }
            else {
                setSelfieApiStatus(`BluePoint retornou HTTP ${result?.status ?? 0}`);
            }
            setBluepointResult(JSON.stringify(result?.data ?? result, null, 2));
            addLog("Consulta BluePoint /biometria/verificar-face executada");
        }
        catch (error) {
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
        }
        catch (error) {
            const message = formatApiError(error);
            setStatusMessage(`Falha ao enviar selfie+documento: ${message}`);
            addLog(`Erro no envio de selfie+documento: ${message}`);
        }
    }
    function handleSelfieCaptured(base64) {
        setSelfieBase64(base64);
        if (base64) {
            setStatusMessage("Captura de selfie realizada com sucesso.");
            addLog("Selfie capturada com sucesso.");
        }
    }
    function handleSelfieDocCaptured(base64) {
        setSelfieDocBase64(base64);
        if (base64) {
            setStatusMessage("Captura de selfie com documento realizada com sucesso.");
            addLog("Selfie+documento capturada com sucesso.");
        }
    }
    async function copyText(label, value) {
        if (!value) {
            setStatusMessage(`Nada para copiar em ${label}`);
            return;
        }
        try {
            await navigator.clipboard.writeText(value);
            setStatusMessage(`${label} copiado para area de transferencia`);
        }
        catch {
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
            navigator.geolocation.getCurrentPosition((pos) => {
                setGeoCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                addLog(`Geolocalizacao GPS obtida: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
            }, () => addLog("Geolocalizacao GPS nao disponivel — usando IP como fallback"), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
        }
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        if (typeof window === "undefined" || window.innerWidth <= 768)
            return;
        const entrySelectors = [
            ".wizard-card",
            ".token-kpi",
            ".side-section",
            ".tab-btn",
            ".chip",
            ".doc-type-card",
            ".module-view-controls"
        ].join(", ");
        const entryElements = Array.from(document.querySelectorAll(entrySelectors));
        gsap.fromTo(entryElements, { y: 8, opacity: 0.92 }, { y: 0, opacity: 1, duration: 0.34, stagger: 0.006, ease: "power2.out", overwrite: "auto" });
        const hoverSelectors = [
            ".button",
            ".tab-btn",
            ".doc-type-card",
            ".token-item-content",
            ".mode-btn"
        ].join(", ");
        const hoverElements = Array.from(document.querySelectorAll(hoverSelectors));
        const cleanups = [];
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
        return (_jsxs("div", { className: "module-view-controls", children: [_jsx("div", { className: "small-text", children: "Modo de visualizacao \u2014 simule como o usuario final enxerga o componente" }), _jsxs("div", { className: "row mode-btn-row", children: [_jsxs("button", { className: `button button-secondary mode-btn ${activeExecutionView === "normal" ? "active" : ""}`, onClick: () => setModuleExecutionView((prev) => ({ ...prev, [activeTab]: "normal" })), children: [_jsx("span", { className: "mode-btn-icon", "aria-hidden": "true", children: "\u25FB" }), _jsx("span", { children: "NORMAL" })] }), _jsxs("button", { className: `button button-secondary mode-btn ${activeExecutionView === "pc" ? "active" : ""}`, onClick: () => setModuleExecutionView((prev) => ({ ...prev, [activeTab]: "pc" })), children: [_jsx("span", { className: "mode-btn-icon", "aria-hidden": "true", children: "\uD83D\uDDA5" }), _jsx("span", { children: "PC" })] }), _jsxs("button", { className: `button button-secondary mode-btn ${activeExecutionView === "celular" ? "active" : ""}`, onClick: () => setModuleExecutionView((prev) => ({ ...prev, [activeTab]: "celular" })), children: [_jsx("span", { className: "mode-btn-icon", "aria-hidden": "true", children: "\uD83D\uDCF1" }), _jsx("span", { children: "CELULAR" })] })] })] }));
    }
    function renderProcessViewport(children) {
        if (executionViewForRender === "normal") {
            return (_jsx("div", { className: "device-shell-plain", children: _jsx("div", { className: "preview-stage plain", children: _jsx("div", { className: "module-runtime-content", children: children }) }) }));
        }
        const isDesktop = executionViewForRender === "pc";
        return (_jsx("div", { className: "device-viewport-wrapper", children: _jsxs("div", { className: `device-frame ${isDesktop ? "device-frame-desktop" : "device-frame-mobile"}`, children: [!isDesktop && (_jsxs(_Fragment, { children: [_jsx("span", { className: "shell-notch" }), _jsx("span", { className: "shell-camera-dot" }), _jsx("span", { className: "shell-btn shell-btn-1" }), _jsx("span", { className: "shell-btn shell-btn-2" }), _jsx("span", { className: "shell-home-indicator" })] })), isDesktop && (_jsxs(_Fragment, { children: [_jsx("span", { className: "shell-screen-gloss" }), _jsx("div", { className: "device-frame-desktop-stand" }), _jsx("div", { className: "device-frame-desktop-base" })] })), _jsx("div", { className: "device-frame-screen", children: _jsx("div", { className: "module-runtime-content", children: children }) })] }) }));
    }
    return (_jsx("div", { className: "preview-root", children: _jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsx("div", { className: "brand", children: "BLUETECH SIGN API" }), _jsx("div", { className: "brand-subtitle", children: "Central visual de integra\u00E7\u00E3o para assinatura, documento e selfie." }), _jsxs("div", { className: "side-section", children: [_jsxs("div", { className: "side-title-row", children: [_jsx("div", { className: "side-title", children: "SERVICE KEY (PARA TESTES)" }), _jsx("span", { className: "help-dot", title: "Use a Service Key para autenticar chamadas nos microservicos. Valide aqui antes de testar os fluxos.", children: "?" })] }), _jsx("div", { className: "small-text side-helper-text", children: "Cole a chave de acesso e valide. Se estiver invalida, expirada ou revogada, o status fica vermelho." }), _jsx("input", { className: "input", value: serviceKey, onChange: (e) => {
                                        const value = e.target.value;
                                        setKey(value);
                                        setServiceKey(value);
                                    }, placeholder: "bt_live_xxxxx" }), _jsxs("div", { className: "row side-actions", children: [_jsx("button", { className: "button", onClick: () => void validateCurrentServiceKey(), children: "VALIDAR TOKEN" }), _jsx("button", { className: "button button-secondary", onClick: () => void copyText("Service key", serviceKey), children: "COPIAR KEY" })] }), _jsx("div", { className: serviceKeyStatusClass, children: serviceKeyStatus })] }), _jsxs("div", { className: "side-section", children: [_jsxs("div", { className: "side-title-row", children: [_jsx("div", { className: "side-title", children: "IDS DE TESTE" }), _jsx("span", { className: "help-dot", title: "signatoryId identifica o assinante e documentId identifica o documento. Eles vinculam assinatura, documento e selfie no mesmo processo.", children: "?" })] }), _jsx("div", { className: "small-text side-helper-text", children: "Os IDs conectam todos os modulos no mesmo ciclo. Gere automatico ou informe manualmente para simular seu sistema real." }), _jsx("button", { className: "button button-secondary side-full-button", onClick: () => void generateTestIds(), children: "GERAR IDS" }), _jsx("input", { className: "input", value: testIds.signatoryId, onChange: (e) => setTestIds((prev) => ({ ...prev, signatoryId: e.target.value })), placeholder: "signatoryId manual" }), _jsx("input", { className: "input", value: testIds.documentId, onChange: (e) => setTestIds((prev) => ({ ...prev, documentId: e.target.value })), placeholder: "documentId manual" }), _jsxs("div", { className: "id-preview", children: [_jsxs("div", { className: "small-text", children: [_jsx("strong", { children: "signatoryId:" }), " ", testIds.signatoryId || "-"] }), _jsxs("div", { className: "small-text", children: [_jsx("strong", { children: "documentId:" }), " ", testIds.documentId || "-"] })] })] }), _jsxs("div", { className: "side-section", children: [_jsx("div", { className: "side-title", children: "LOG DE OPERACOES" }), _jsx("div", { className: "log-box", children: logs.map((line) => (_jsx("div", { className: "log-line", children: line }, line))) }), _jsxs("div", { className: "small-text", children: ["Health checks OK: ", healthCount] })] })] }), _jsxs("main", { className: "main", children: [_jsx("div", { className: "tab-row", children: tabs.map((tab) => (_jsx("button", { className: `tab-btn ${activeTab === tab.key ? "active" : ""}`, onClick: () => setActiveTab(tab.key), children: tab.label }, tab.key))) }), _jsxs("div", { className: "card", children: [activeTab === "tokens" && (_jsxs(_Fragment, { children: [_jsx("h2", { children: "GERENCIAMENTO DE TOKENS DE API" }), _jsx(MagicBento, { cards: [
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
                                            ] }), _jsxs("div", { className: "token-kpis", children: [_jsxs("div", { className: "token-kpi", children: [_jsx("strong", { children: activeTokenCount }), _jsx("span", { children: "Tokens ativos" })] }), _jsxs("div", { className: "token-kpi", children: [_jsx("strong", { children: selectedScopeCount }), _jsx("span", { children: "Escopos do perfil" })] }), _jsxs("div", { className: "token-kpi", children: [_jsx("strong", { children: uniqueScopeCount }), _jsx("span", { children: "Escopos em uso" })] })] }), _jsxs("div", { className: "wizard-card", children: [_jsx("h3", { children: "Criar novo token" }), _jsxs("div", { className: "small-text", children: ["Selecione o perfil de permissao e configure a vigencia. ", _jsx("span", { title: "A validade define ate quando o token permanece aceito. Sem validade, ele funciona ate ser revogado manualmente.", children: "\u2139" })] }), _jsx("div", { className: "row", children: _jsx("select", { className: "input", value: scopeProfile, onChange: (e) => setScopeProfile(e.target.value), children: Object.entries(scopeProfiles).map(([key, profile]) => (_jsx("option", { value: key, children: profile.label }, key))) }) }), _jsxs("div", { className: "row", children: [_jsx("input", { className: "input", value: tokenName, onChange: (e) => setTokenName(e.target.value), placeholder: "Nome do token (ex.: App Producao)" }), _jsx("input", { className: "input", value: expiresInDaysInput, onChange: (e) => setExpiresInDaysInput(e.target.value.replace(/[^\d]/g, "")), placeholder: "Validade em dias (vazio = sem expiracao)" }), _jsx("button", { className: "button", onClick: () => void generateToken(), children: "GERAR TOKEN" })] }), _jsxs("div", { className: "small-text", children: ["Perfil selecionado: ", scopeProfiles[scopeProfile].label] })] }), !!lastToken && (_jsxs("div", { className: "wizard-card token-highlight", children: [_jsx("h3", { children: "Token gerado agora" }), _jsxs("div", { className: "token-preview-row", children: [_jsx("code", { className: "token-preview-value", children: lastToken }), _jsx("button", { className: "button button-secondary", onClick: () => void copyText("Token gerado", lastToken), children: "COPIAR TOKEN" })] }), _jsx("div", { className: "small-text", children: "Guarde este valor com seguranca. Depois de revogar, ele deixa de funcionar." })] })), _jsxs("div", { className: "wizard-card", children: [_jsx("h3", { children: "Tokens cadastrados" }), _jsx("div", { className: "small-text", children: "Gerencie os tokens ativos. Clique em \"Mostrar lista\" para visualizar, selecionar detalhes ou revogar individualmente." }), _jsxs("div", { className: "row", children: [_jsx("button", { className: "button button-secondary", onClick: () => { setShowTokenList((prev) => !prev); if (!showTokenList)
                                                                void refreshTokens(); }, children: showTokenList ? "OCULTAR LISTA" : "MOSTRAR LISTA" }), _jsx("button", { className: "button button-secondary", onClick: () => void refreshTokens(), children: "ATUALIZAR" })] })] }), showTokenList && (_jsxs("div", { className: "token-list", children: [_jsx(AnimatedList, { items: tokens, onItemSelect: (token) => setSelectedTokenId(token.id), showGradients: true, enableArrowNavigation: true, displayScrollbar: true, initialSelectedIndex: selectedTokenIndex, getItemKey: (token) => token.id, itemClassName: "token-animated-item", renderItem: (token) => (_jsxs("div", { className: `token-item-content ${token.is_active === false ? "token-item-revoked" : ""}`, children: [_jsxs("div", { className: "token-item-head", children: [_jsx("div", { className: "token-name", children: token.name }), _jsxs("div", { className: "row token-actions-row", children: [_jsx("button", { className: "button button-secondary button-sm", onClick: (event) => {
                                                                                    event.stopPropagation();
                                                                                    setSelectedTokenId(token.id);
                                                                                }, children: "Detalhes" }), token.is_active !== false && (_jsx("button", { className: "button button-danger button-sm", onClick: (event) => {
                                                                                    event.stopPropagation();
                                                                                    requestRevokeToken(token);
                                                                                }, children: "Revogar" }))] })] }), _jsx("div", { className: "small-text token-scopes-line", children: (token.scopes ?? []).join(", ") }), _jsx("div", { className: "small-text", children: getTokenValidityLabel(token) })] })) }), !tokens.length && _jsx("div", { className: "small-text", children: "Nenhum token cadastrado no momento." })] })), revokeConfirm && (_jsx("div", { className: "revoke-modal-overlay", onClick: () => setRevokeConfirm(null), children: _jsxs("div", { className: "revoke-modal", onClick: (e) => e.stopPropagation(), children: [_jsx("h3", { children: "Confirmar revogacao" }), _jsxs("div", { className: "small-text", children: ["Para revogar o token ", _jsxs("strong", { children: ["\"", revokeConfirm.name, "\""] }), ", digite o nome exato abaixo para confirmar. Esta acao e irreversivel."] }), _jsx("input", { className: "input", value: revokeConfirmInput, onChange: (e) => setRevokeConfirmInput(e.target.value), placeholder: `Digite: ${revokeConfirm.name}`, autoFocus: true }), _jsxs("div", { className: "row revoke-modal-actions", children: [_jsx("button", { className: "button button-secondary", onClick: () => setRevokeConfirm(null), children: "CANCELAR" }), _jsx("button", { className: "button button-danger", disabled: revokeConfirmInput !== revokeConfirm.name, onClick: () => void confirmRevokeToken(), children: "CONFIRMAR REVOGACAO" })] })] }) })), selectedToken && (_jsxs("div", { className: "wizard-card", children: [_jsx("h3", { children: "Detalhes do token selecionado" }), _jsxs("div", { className: "small-text", children: ["Nome: ", selectedToken.name] }), _jsxs("div", { className: selectedToken.is_active === false ? "status-danger" : "status-ok", children: ["Status: ", selectedToken.is_active === false ? "Inativo / Revogado" : "Ativo"] }), _jsxs("div", { className: "small-text", children: ["Criado em: ", formatDateLabel(selectedToken.created_at)] }), _jsxs("div", { className: "small-text", children: ["Ultimo uso: ", formatDateLabel(selectedToken.last_used_at)] }), _jsxs("div", { className: "small-text", children: ["Vigencia: ", getTokenValidityLabel(selectedToken)] }), _jsxs("div", { className: "small-text", children: ["ID interno: ", selectedToken.id] })] })), _jsx("div", { className: "small-text", children: "Vigencia dos tokens: com \"Validade em dias\", o token expira automaticamente; sem esse campo, o token permanece valido ate voce revogar." })] })), activeTab === "assinatura" && (_jsxs(_Fragment, { children: [renderModuleViewControls(), renderProcessViewport(_jsxs(_Fragment, { children: [_jsx("h2", { children: "CAPTURA DE ASSINATURA" }), _jsx("div", { className: "small-text", children: "Escolha o modo de captura. O desenho manual e o padrao recomendado. No modo digitar, o texto e convertido automaticamente em assinatura cursiva." }), _jsxs("div", { className: "row sig-mode-row", children: [_jsx("button", { className: `button button-secondary sig-mode-btn ${signatureMode === "desenhar" ? "active" : ""}`, onClick: () => setSignatureMode("desenhar"), children: "DESENHAR" }), _jsx("button", { className: `button button-secondary sig-mode-btn ${signatureMode === "digitar" ? "active" : ""}`, onClick: () => setSignatureMode("digitar"), children: "DIGITAR" })] }), signatureMode === "desenhar" ? (_jsx(SignatureCanvas, { onChange: setSignatureBase64 })) : (_jsxs(_Fragment, { children: [_jsx("input", { className: "input", value: signatureText, onChange: (e) => setSignatureText(e.target.value), placeholder: "Digite seu nome completo" }), _jsx(TypedSignatureCanvas, { text: signatureText, onChange: setSignatureBase64 }), _jsx("div", { className: "small-text", children: "A assinatura tipografica sera convertida em imagem automaticamente." })] })), _jsx("button", { className: "button sig-submit-btn", onClick: () => void submitSignature(), children: "ENVIAR ASSINATURA" })] }))] })), activeTab === "documento" && (_jsxs(_Fragment, { children: [renderModuleViewControls(), renderProcessViewport(_jsxs(_Fragment, { children: [_jsx("h2", { children: "CAPTURA DE DOCUMENTO" }), _jsxs("div", { className: "doc-step-indicator", children: [_jsxs("div", { className: `doc-step ${docFlowStep === "select" ? "active" : "done"}`, children: [_jsx("span", { className: "doc-step-num", children: "1" }), _jsx("span", { className: "doc-step-label", children: "Tipo" })] }), _jsx("div", { className: "doc-step-line" }), _jsxs("div", { className: `doc-step ${docFlowStep === "front" ? "active" : (["back", "review"].includes(docFlowStep) ? "done" : "")}`, children: [_jsx("span", { className: "doc-step-num", children: "2" }), _jsx("span", { className: "doc-step-label", children: "Frente" })] }), needsBack && _jsxs(_Fragment, { children: [_jsx("div", { className: "doc-step-line" }), _jsxs("div", { className: `doc-step ${docFlowStep === "back" ? "active" : (docFlowStep === "review" ? "done" : "")}`, children: [_jsx("span", { className: "doc-step-num", children: "3" }), _jsx("span", { className: "doc-step-label", children: "Verso" })] })] }), _jsx("div", { className: "doc-step-line" }), _jsxs("div", { className: `doc-step ${docFlowStep === "review" ? "active" : ""}`, children: [_jsx("span", { className: "doc-step-num", children: needsBack ? "4" : "3" }), _jsx("span", { className: "doc-step-label", children: "Enviar" })] })] }), docBackStepCueVisible && (_jsxs("div", { className: "doc-back-step-cue", role: "status", "aria-live": "polite", children: ["\u2705 Frente salva. Agora tire a foto do ", _jsx("strong", { children: "VERSO" }), "."] })), docFlowStep === "select" && (_jsxs("div", { className: "wizard-card", children: [_jsx("div", { className: "small-text", children: "Selecione o tipo de documento para iniciar a captura." }), _jsx("div", { className: "doc-type-grid", children: docTypeOptions.map((option) => (_jsxs("button", { className: `doc-type-card ${docType === option.value ? "active" : ""}`, onClick: () => selectDocumentType(option.value), type: "button", children: [_jsx("div", { className: "doc-type-icon", children: option.icon }), _jsx("div", { className: "doc-type-badge", children: option.badge }), _jsx("div", { className: "doc-type-title", children: option.label }), _jsx("div", { className: "doc-type-subtitle", children: option.subtitle })] }, option.value))) })] }, "step-select")), docFlowStep === "front" && (_jsxs("div", { className: "wizard-card", children: [_jsxs("div", { className: "small-text", children: ["Passo 2 de ", needsBack ? "4" : "3", ": capture ou anexe a foto da ", _jsx("strong", { children: "FRENTE" }), " do ", docType.toUpperCase(), "."] }), _jsx(CameraCapture, { mode: "document", onCapture: (b64) => {
                                                                setFrontDocumentBase64(b64);
                                                                if (b64) {
                                                                    setStatusMessage("Frente capturada. Avancando...");
                                                                    setTimeout(() => goToDocFlowStep(needsBack ? "back" : "review"), 600);
                                                                }
                                                            }, documentType: docType, side: "front", allowFileUpload: true, onValidation: setDocValidation }), _jsxs("div", { className: "row", children: [_jsx("button", { className: "button button-secondary", onClick: () => goToDocFlowStep("select"), children: "VOLTAR" }), _jsx("button", { className: "button", disabled: !frontDocumentBase64, onClick: () => goToDocFlowStep(needsBack ? "back" : "review"), children: "PROXIMO PASSO" })] })] }, "step-front")), docFlowStep === "back" && (_jsxs("div", { className: "wizard-card", children: [_jsxs("div", { className: "small-text", children: ["Passo 3 de 4: capture ou anexe a foto do ", _jsx("strong", { children: "VERSO" }), " do ", docType.toUpperCase(), "."] }), _jsx(CameraCapture, { mode: "document", onCapture: (b64) => {
                                                                setBackDocumentBase64(b64);
                                                                if (b64) {
                                                                    setStatusMessage("Verso capturado. Avancando para revisao...");
                                                                    setTimeout(() => goToDocFlowStep("review"), 600);
                                                                }
                                                            }, documentType: docType, side: "back", allowFileUpload: true, onValidation: setDocValidation }), _jsxs("div", { className: "row", children: [_jsx("button", { className: "button button-secondary", onClick: () => goToDocFlowStep("front"), children: "VOLTAR" }), _jsx("button", { className: "button", disabled: !backDocumentBase64, onClick: () => goToDocFlowStep("review"), children: "REVISAR" })] })] }, "step-back")), docFlowStep === "review" && (_jsxs("div", { className: "wizard-card", children: [_jsxs("div", { className: "small-text", children: ["Passo ", needsBack ? "4 de 4" : "3 de 3", ": confirme as capturas do ", _jsx("strong", { children: docType.toUpperCase() }), ". Frente", needsBack ? " e verso serao combinados" : " sera salva", " em ", _jsx("strong", { children: "um unico PNG" }), " com rodape de IP, geolocalizacao, data/hora e user-agent."] }), _jsxs("div", { className: "doc-review-grid", children: [_jsxs("div", { className: "doc-review-item", children: [_jsx("div", { className: "doc-review-label", children: "Frente" }), frontDocumentBase64 ? _jsx("img", { src: frontDocumentBase64, alt: "frente", className: "doc-review-thumb" }) : _jsx("div", { className: "doc-review-pending", children: "Pendente" })] }), needsBack && (_jsxs("div", { className: "doc-review-item", children: [_jsx("div", { className: "doc-review-label", children: "Verso" }), backDocumentBase64
                                                                            ? _jsx("img", { src: backDocumentBase64, alt: "verso", className: "doc-review-thumb" })
                                                                            : _jsx("div", { className: "doc-review-pending", children: "Opcional \u2014 n\u00E3o capturado" })] }))] }), _jsxs("div", { className: "doc-combined-info", children: [_jsx("span", { className: "doc-combined-icon", children: "\uD83D\uDDC2\uFE0F" }), _jsxs("span", { children: ["Tipo: ", _jsx("strong", { children: docType.toUpperCase() }), " \u00B7 Arquivo \u00FAnico \u00B7 Metadados: IP, geolocaliza\u00E7\u00E3o, data/hora BRT, user-agent"] })] }), _jsxs("div", { className: "row", children: [_jsx("button", { className: "button button-secondary", onClick: () => goToDocFlowStep(needsBack ? "back" : "front"), children: "VOLTAR" }), _jsx("button", { className: "button sig-submit-btn", disabled: !frontDocumentBase64, onClick: () => void submitDocumentFlow(), children: "FINALIZAR E ENVIAR" })] }), _jsx("button", { className: "button button-secondary", style: { marginTop: "6px", width: "100%" }, onClick: resetDocumentFlow, children: "REINICIAR FLUXO" })] }, "step-review"))] }))] })), activeTab === "selfie" && (_jsxs(_Fragment, { children: [renderModuleViewControls(), renderProcessViewport(_jsxs(_Fragment, { children: [_jsx("h2", { children: "SELFIE BIOMETRICA" }), _jsx("div", { className: "small-text", children: "Capture sua selfie com a camera frontal. A imagem sera salva com metadados de registro (IP, localizacao, data/hora)." }), _jsx(CameraCapture, { mode: "selfie", onCapture: handleSelfieCaptured, allowFileUpload: false, onValidation: setSelfieValidation }), _jsxs("div", { className: "wizard-card", children: [_jsx("h3", { children: "Integracao BluePoint" }), _jsxs("div", { className: "small-text", children: ["Endpoint: ", _jsx("code", { children: "POST /api/v1/biometria/verificar-face" }), " \u2014 Envia a selfie para verificacao biometrica."] }), _jsx("a", { className: "small-text", href: "https://bluepoint-api.bluetechfilms.com.br/docs/biometria", target: "_blank", rel: "noreferrer", children: "Documentacao oficial BluePoint" }), _jsx("input", { className: "input", value: selfieApiUrl, onChange: (e) => setSelfieApiUrl(e.target.value), placeholder: "URL da API BluePoint" }), _jsx("input", { className: "input", value: selfieApiToken, onChange: (e) => setSelfieApiToken(e.target.value), placeholder: "Token JWT ou API Key" }), _jsx("div", { className: "row", children: _jsx("button", { className: "button sig-submit-btn", onClick: () => void verifySelfieWithBluepoint(), children: "VERIFICAR FACE" }) }), _jsx("div", { className: selfieApiStatus.toLowerCase().includes("sucesso") ? "status-ok" : "status-warn", children: selfieApiStatus }), bluepointResult && _jsx("textarea", { className: "input", rows: 6, readOnly: true, value: bluepointResult })] })] }))] })), activeTab === "selfieDoc" && (_jsxs(_Fragment, { children: [renderModuleViewControls(), renderProcessViewport(_jsxs(_Fragment, { children: [_jsx("h2", { children: "SELFIE COM DOCUMENTO" }), _jsx("div", { className: "small-text", children: "Posicione seu rosto no circulo superior e o documento no retangulo inferior. A camera identifica ambos automaticamente." }), _jsxs("div", { className: "selfie-doc-guide-info", children: [_jsxs("div", { className: "guide-info-item", children: [_jsx("span", { className: "guide-info-icon", children: "\u26AA" }), _jsx("span", { children: "Rosto centralizado no circulo" })] }), _jsxs("div", { className: "guide-info-item", children: [_jsx("span", { className: "guide-info-icon", children: "\u25A2" }), _jsx("span", { children: "Documento visivel no retangulo" })] })] }), _jsx(CameraCapture, { mode: "selfieDoc", onCapture: handleSelfieDocCaptured, allowFileUpload: false, onValidation: setSelfieDocValidation }), _jsx("button", { className: "button sig-submit-btn", disabled: !selfieDocBase64, onClick: () => void submitSelfieDoc(), children: "ENVIAR CAPTURA" })] }))] })), activeTab === "docs" && (_jsxs(_Fragment, { children: [_jsx("h2", { children: "DOCUMENTACAO E DOWNLOADS" }), _jsxs("div", { className: "wizard-card", children: [_jsx("h3", { children: "Guia de integracao" }), _jsx("div", { className: "small-text", children: "1) Gere e valide token." }), _jsx("div", { className: "small-text", children: "2) Gere IDs de teste." }), _jsx("div", { className: "small-text", children: "3) Teste assinatura, documento, selfie e selfie+doc." }), _jsx("div", { className: "small-text", children: "4) Baixe o kit e incorpore no projeto." })] }), _jsxs("div", { className: "wizard-card", children: [_jsx("h3", { children: "Downloads por interface" }), _jsxs("div", { className: "row", children: [_jsx("a", { className: "button", href: "/downloads/bluetech-sign-react-kit.zip", download: true, children: "BAIXAR KIT ASSINATURA" }), _jsx("a", { className: "button", href: "/downloads/bluetech-sign-react-kit.zip", download: true, children: "BAIXAR KIT DOCUMENTO" }), _jsx("a", { className: "button", href: "/downloads/bluetech-sign-react-kit.zip", download: true, children: "BAIXAR KIT SELFIE" }), _jsx("a", { className: "button", href: "/downloads/bluetech-sign-react-kit.zip", download: true, children: "BAIXAR KIT SELFIE+DOC" })] }), _jsxs("div", { className: "row", children: [_jsx("a", { className: "button button-secondary", href: "/downloads/bluetech-sign-integration-full.zip", download: true, children: "BAIXAR PACOTE COMPLETO (REACT + PYTHON)" }), _jsx("a", { className: "button button-secondary", href: "/downloads/bluetech-sign-react-kit-0.1.0.tgz", download: true, children: "BAIXAR PACOTE NPM (.tgz)" })] }), _jsxs("div", { className: "small-text", children: ["Se o download falhar, recarregue a pagina e tente novamente. Os arquivos ficam em ", _jsx("code", { children: "/downloads" }), "."] })] }), _jsxs("div", { className: "wizard-card", children: [_jsx("h3", { children: "Importar no projeto cliente" }), _jsx("div", { className: "small-text", children: "Opcao 1 (manual): baixe o ZIP e extraia na pasta do seu projeto." }), _jsx("div", { className: "small-text", children: "Opcao 2 (automatizada PowerShell):" }), _jsx("textarea", { className: "input", rows: 3, readOnly: true, value: 'powershell -ExecutionPolicy Bypass -File scripts/install-integration-kit.ps1 -TargetProjectPath "C:\\meu-projeto" -Mode full' })] }), _jsxs("div", { className: "wizard-card", children: [_jsx("h3", { children: "Endpoints ativos" }), docs.map((endpoint) => (_jsx("div", { className: "small-text", children: endpoint }, endpoint)))] })] }))] }), _jsx("div", { className: "status-bar", children: statusMessage })] })] }) }));
}
