import { useMemo, useState } from "react";
import { createToken, listTokens } from "../services/api";

export function TokensPage() {
  const [name, setName] = useState("App Mobile");
  const [token, setToken] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const scopes = useMemo(() => ["documento:upload", "selfie-documento:capture", "assinatura:create"], []);

  async function handleCreate() {
    const data = await createToken(name, scopes);
    setToken(data.data.token);
    const list = await listTokens();
    setItems(list.data ?? []);
  }

  return (
    <div>
      <div className="card">
        <h2>Gerenciamento de Tokens de API</h2>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="button" onClick={handleCreate}>GERAR TOKEN</button>
          <span className="status-ok">{token ? `token: ${token}` : "nenhum token gerado"}</span>
        </div>
      </div>

      <div className="card">
        <h3>Tokens ativos</h3>
        {items.map((item) => (
          <div key={item.id}>{item.name} - {item.id}</div>
        ))}
      </div>
    </div>
  );
}
