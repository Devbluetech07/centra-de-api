import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { salvarAssinatura } from "../services/api";
export function AssinaturaPage() {
    const [base64, setBase64] = useState("");
    const [status, setStatus] = useState("Aguardando assinatura");
    async function handleSubmit() {
        if (!base64)
            return;
        await salvarAssinatura({
            signatoryId: crypto.randomUUID(),
            documentId: crypto.randomUUID(),
            imageBase64: base64,
            userAgent: navigator.userAgent
        });
        setStatus("Assinatura enviada com sucesso");
    }
    return (_jsxs("div", { className: "card", children: [_jsx("h2", { children: "Captura de Assinatura" }), _jsx("textarea", { className: "input", rows: 8, value: base64, onChange: (e) => setBase64(e.target.value), placeholder: "Cole base64 da assinatura" }), _jsxs("div", { className: "row", style: { marginTop: 12 }, children: [_jsx("button", { className: "button", onClick: handleSubmit, children: "ENVIAR ASSINATURA" }), _jsx("span", { className: "status-warn", children: status })] })] }));
}
