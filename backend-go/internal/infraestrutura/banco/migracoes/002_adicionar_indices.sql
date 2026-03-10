CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_chaves_api_owner_token_hash ON chaves_api(owner_token_hash);
CREATE INDEX IF NOT EXISTS idx_capturas_token_hash_dono ON capturas(token_hash_dono);
CREATE INDEX IF NOT EXISTS idx_capturas_tipo_servico ON capturas(tipo_servico);
