import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { createToken, listTokens } from "../services/api";
export function TokensPage() {
    const [name, setName] = useState("App Mobile");
    const [token, setToken] = useState("");
    const [items, setItems] = useState([]);
    const scopes = useMemo(() => ["documento:upload", "selfie-documento:capture", "assinatura:create"], []);
    async function handleCreate() {
        const data = await createToken(name, scopes);
        setToken(data.data.token);
        const list = await listTokens();
        setItems(list.data ?? []);
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "card", children: [_jsx("h2", { children: "Gerenciamento de Tokens de API" }), _jsx("input", { className: "input", value: name, onChange: (e) => setName(e.target.value) }), _jsxs("div", { className: "row", style: { marginTop: 12 }, children: [_jsx("button", { className: "button", onClick: handleCreate, children: "GERAR TOKEN" }), _jsx("span", { className: "status-ok", children: token ? `token: ${token}` : "nenhum token gerado" })] })] }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Tokens ativos" }), items.map((item) => (_jsxs("div", { children: [item.name, " - ", item.id] }, item.id)))] })] }));
}
