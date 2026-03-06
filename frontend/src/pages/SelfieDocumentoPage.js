import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsxs("div", { className: "card", children: [_jsx("h2", { children: "Selfie com Documento" }), _jsx("div", { className: "capture-guide", children: "Guia oval + retangulo (rosto e documento)" }), _jsx("textarea", { className: "input", rows: 7, style: { marginTop: 12 }, value: imageBase64, onChange: (e) => setImageBase64(e.target.value), placeholder: "Cole base64 da captura" }), _jsxs("div", { className: "row", style: { marginTop: 12 }, children: [_jsx("button", { className: "button", disabled: !canCapture, onClick: handleCapture, children: "CAPTURAR SELFIE+DOC" }), _jsx("span", { className: canCapture ? "status-ok" : "status-danger", children: canCapture ? "enquadramento valido" : "centralize rosto e documento" })] }), _jsx("div", { className: "status-warn", style: { marginTop: 8 }, children: status })] }));
}
