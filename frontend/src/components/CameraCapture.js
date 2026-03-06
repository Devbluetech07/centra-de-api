import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
export function CameraCapture({ mode, onCapture, documentType = "rg", side = "front", allowFileUpload = true, onValidation }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const wsRef = useRef(null);
    const timerRef = useRef(null);
    const [cameraOn, setCameraOn] = useState(false);
    const [preview, setPreview] = useState("");
    const [error, setError] = useState("");
    const [validation, setValidation] = useState({
        canCapture: false,
        feedback: "Inicie a camera para validar enquadramento",
        validationIssues: []
    });
    const facingMode = useMemo(() => (mode === "document" ? "environment" : "user"), [mode]);
    const validatorWsBase = useMemo(() => {
        const envVars = import.meta.env;
        const httpUrl = envVars?.VITE_VALIDATOR_URL ?? "http://localhost:38000";
        return httpUrl.replace(/^http/, "ws");
    }, []);
    const wsUrl = useMemo(() => mode === "document"
        ? `${validatorWsBase}/ws/validate-document`
        : mode === "selfie"
            ? `${validatorWsBase}/ws/validate-face`
            : `${validatorWsBase}/ws/validate-selfie-document`, [mode, validatorWsBase]);
    const canManualCapture = cameraOn && (mode === "document" || mode === "selfie" || mode === "selfieDoc");
    const canCaptureNow = validation.canCapture || canManualCapture;
    function shutdownCamera() {
        stopRealtimeValidation();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }
        setCameraOn(false);
    }
    function stopRealtimeValidation() {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }
    useEffect(() => {
        return () => {
            stopRealtimeValidation();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);
    useEffect(() => {
        onValidation?.(validation);
    }, [validation, onValidation]);
    function snapshotFrame() {
        const video = videoRef.current;
        if (!video)
            return "";
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const context = canvas.getContext("2d");
        if (!context)
            return "";
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.86);
    }
    function startRealtimeValidation() {
        stopRealtimeValidation();
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
            timerRef.current = window.setInterval(() => {
                if (!videoRef.current || ws.readyState !== WebSocket.OPEN)
                    return;
                const imageBase64 = snapshotFrame();
                if (!imageBase64)
                    return;
                const payload = mode === "document" ? { imageBase64, type: documentType, side } : { imageBase64 };
                ws.send(JSON.stringify(payload));
            }, 800);
        };
        ws.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                const data = parsed?.data ?? {};
                const normalized = {
                    canCapture: Boolean(data.canCapture),
                    feedback: String(data.feedback ?? "Aguardando validacao"),
                    validationIssues: Array.isArray(data.validationIssues) ? data.validationIssues : []
                };
                setValidation(normalized);
            }
            catch {
                setValidation({
                    canCapture: false,
                    feedback: "Erro ao processar validacao em tempo real",
                    validationIssues: ["erro_parse_validacao"]
                });
            }
        };
        ws.onerror = () => {
            setValidation({
                canCapture: true,
                feedback: "Validacao em tempo real indisponivel — captura manual permitida",
                validationIssues: []
            });
        };
        ws.onclose = () => {
            if (cameraOn) {
                setValidation((prev) => prev.feedback.toLowerCase().includes("indisponivel") || prev.feedback.toLowerCase().includes("sucesso") ? prev : {
                    canCapture: true,
                    feedback: "Conexao de validacao encerrada — captura manual permitida",
                    validationIssues: []
                });
            }
        };
    }
    async function startCamera() {
        try {
            setError("");
            setPreview("");
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: facingMode },
                    width: { ideal: 720 },
                    height: { ideal: 1280 }
                },
                audio: false
            });
            streamRef.current = stream;
            setCameraOn(true);
            const video = videoRef.current;
            if (video) {
                video.srcObject = stream;
                await new Promise((resolve) => {
                    if (video.readyState >= 1) {
                        resolve();
                        return;
                    }
                    const onLoaded = () => {
                        video.removeEventListener("loadedmetadata", onLoaded);
                        resolve();
                    };
                    video.addEventListener("loadedmetadata", onLoaded);
                    window.setTimeout(() => {
                        video.removeEventListener("loadedmetadata", onLoaded);
                        resolve();
                    }, 700);
                });
                await video.play();
            }
            startRealtimeValidation();
        }
        catch {
            setError("Não foi possível acessar a câmera. Verifique permissões do navegador.");
            setCameraOn(false);
        }
    }
    function stopCamera() {
        shutdownCamera();
        setValidation({
            canCapture: false,
            feedback: "Camera parada",
            validationIssues: []
        });
    }
    function captureFrame() {
        if (!canCaptureNow)
            return;
        const base64 = snapshotFrame();
        if (!base64)
            return;
        setPreview(base64);
        setValidation({
            canCapture: true,
            feedback: "Captura realizada com sucesso",
            validationIssues: []
        });
        shutdownCamera();
        onCapture(base64);
    }
    function handleFile(event) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = String(reader.result ?? "");
            setPreview(base64);
            setValidation({
                canCapture: true,
                feedback: "Imagem anexada com sucesso",
                validationIssues: []
            });
            if (cameraOn)
                shutdownCamera();
            onCapture(base64);
        };
        reader.readAsDataURL(file);
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "camera-stage", children: [_jsx("video", { ref: videoRef, className: "camera-video", playsInline: true, muted: true, style: { opacity: cameraOn ? 1 : 0 } }), cameraOn && (_jsxs(_Fragment, { children: [mode === "document" && _jsx("div", { className: "guide-document" }), mode === "selfie" && _jsx("div", { className: "guide-face" }), mode === "selfieDoc" && (_jsxs(_Fragment, { children: [_jsx("div", { className: "guide-face" }), _jsx("div", { className: "guide-doc" })] }))] })), !cameraOn && preview && _jsx("img", { src: preview, alt: "captura final", className: "camera-video" })] }), _jsxs("div", { className: "row", children: [!cameraOn ? (_jsx("button", { type: "button", className: "button", onClick: startCamera, children: "INICIAR C\u00C2MERA" })) : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "button", onClick: captureFrame, disabled: !canCaptureNow, children: "CAPTURAR" }), _jsx("button", { type: "button", className: "button button-secondary", onClick: stopCamera, children: "PARAR" })] })), allowFileUpload && (_jsxs("label", { className: "button button-secondary file-button", children: ["ANEXAR IMAGEM", _jsx("input", { type: "file", accept: "image/*", onChange: handleFile, hidden: true })] }))] }), error && _jsx("div", { className: "status-danger", children: error }), _jsx("div", { className: `camera-feedback ${validation.canCapture ? "status-ok" : "status-warn"}`, children: mode === "document" && !validation.canCapture
                    ? "Validação assistida ativa. Se o documento estiver visível, pode capturar."
                    : validation.feedback }), mode === "document" && !validation.canCapture && (_jsx("div", { className: "small-text", children: "Se o documento estiver no quadro, voce pode capturar manualmente." })), mode === "selfieDoc" && !validation.canCapture && (_jsx("div", { className: "small-text", children: "Se rosto e documento estiverem visiveis, voce pode capturar manualmente." })), !validation.canCapture && validation.validationIssues.length > 0 && mode !== "document" && (_jsx("div", { className: "camera-issues", children: validation.validationIssues.map((issue, i) => (_jsx("span", { className: "camera-issue-chip", children: issue.replace(/_/g, " ") }, i))) })), !cameraOn && preview && (_jsx("div", { className: "preview-wrap", children: _jsx("img", { src: preview, alt: "captura", className: "preview-image" }) }))] }));
}
