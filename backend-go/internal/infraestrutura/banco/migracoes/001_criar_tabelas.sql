CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    nome_completo TEXT NOT NULL,
    hash_senha TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_usuarios_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS chaves_api (
    id UUID PRIMARY KEY,
    nome TEXT NOT NULL,
    prefixo TEXT NOT NULL,
    chave_hash TEXT NOT NULL,
    owner_token_hash TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capturas (
    id UUID PRIMARY KEY,
    token_hash_dono TEXT NOT NULL,
    tipo_servico TEXT NOT NULL,
    status TEXT NOT NULL,
    caminho_imagem TEXT NOT NULL,
    metadados_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
