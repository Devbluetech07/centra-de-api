# Security Hardening - Fase 1

## 1) Limpeza de `.env` do histórico Git

Use o script:

```bash
bash scripts/security-clean-git-env.sh main
```

O script:
- remove `.env` do histórico com `git filter-branch`
- garante `.env` no `.gitignore`
- força push de branches e tags
- imprime novos segredos fortes gerados com `openssl`

## 2) Comandos avulsos para gerar credenciais fortes

```bash
openssl rand -base64 48 | tr -d '\n'   # JWT_SECRET
openssl rand -base64 32 | tr -d '\n'   # DB_PASSWORD
openssl rand -base64 32 | tr -d '\n'   # MINIO_ROOT_PASSWORD
```

## 3) Secrets obrigatórios

- `JWT_SECRET` (obrigatório, minimo de 32 caracteres, sem valor padrao)
- `DB_PASSWORD` (forte, 32+ recomendado)
- `MINIO_ROOT_PASSWORD` (forte, 32+ recomendado)

## 4) Padrao seguro para queries dinamicas

- Nunca inserir valores de usuario no SQL.
- Validar filtros com allowlist antes de montar query.
- Usar querys predefinidas por combinacao de filtros.
- Usar somente placeholders posicionais (`$1`, `$2`, `$3`...).

Exemplo aplicado em `GetCaptures`:
- com filtro: query fixa com `tipo_servico = $2`
- sem filtro: query fixa sem `tipo_servico`

## 5) Checklist de verificacao pos-execucao

- [ ] `git log --all -- .env` nao retorna commits com o arquivo sensivel
- [ ] `.env` nao aparece mais no `git status` (tracked)
- [ ] `.env.example` existe e nao contem credenciais reais
- [ ] credenciais antigas foram revogadas e substituidas
- [ ] login JWT continua funcional com novo `JWT_SECRET`
- [ ] endpoints com API key continuam funcionando
- [ ] monitorar logs por tentativas de token demo em producao
