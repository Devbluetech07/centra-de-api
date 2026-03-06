import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsxs("div", { className: "card", children: [_jsx("h2", { children: "Captura de Documento" }), _jsxs("div", { className: "row", children: [_jsxs("select", { className: "input", value: type, onChange: (e) => setType(e.target.value), children: [_jsx("option", { value: "rg", children: "RG" }), _jsx("option", { value: "cnh", children: "CNH" }), _jsx("option", { value: "cnh_digital", children: "CNH Digital" }), _jsx("option", { value: "passport", children: "Passaporte" })] }), _jsxs("select", { className: "input", value: side, onChange: (e) => setSide(e.target.value), children: [_jsx("option", { value: "front", children: "Frente" }), _jsx("option", { value: "back", children: "Verso" }), _jsx("option", { value: "single", children: "Unico" })] })] }), _jsx("div", { className: "capture-guide", style: { marginTop: 12 }, children: "Guia retangular de enquadramento" }), _jsx("textarea", { className: "input", rows: 6, style: { marginTop: 12 }, value: imageBase64, onChange: (e) => setImageBase64(e.target.value), placeholder: "Cole base64 da captura" }), _jsxs("div", { className: "row", style: { marginTop: 12 }, children: [_jsx("button", { className: "button", disabled: !canCapture, onClick: handleCapture, children: "CAPTURAR E ENVIAR" }), _jsx("span", { className: canCapture ? "status-ok" : "status-danger", children: canCapture ? "pronto para capturar" : "aguardando enquadramento" })] }), _jsx("div", { className: "status-warn", style: { marginTop: 8 }, children: status })] }));
}
