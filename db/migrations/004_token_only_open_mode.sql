-- UP
ALTER TABLE registros_captura ADD COLUMN IF NOT EXISTS token_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_registros_token_hash ON registros_captura(token_hash);

ALTER TABLE chaves_api ADD COLUMN IF NOT EXISTS owner_token_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_chaves_owner_token_hash ON chaves_api(owner_token_hash);

ALTER TABLE chaves_api ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE chaves_api DROP CONSTRAINT IF EXISTS chaves_api_usuario_id_fkey;
ALTER TABLE registros_captura DROP CONSTRAINT IF EXISTS registros_captura_usuario_id_fkey;
ALTER TABLE ai_requests DROP CONSTRAINT IF EXISTS ai_requests_user_id_fkey;

DROP TABLE IF EXISTS perfis;
DROP TABLE IF EXISTS users;

-- DOWN
-- Restoring users/perfis and foreign keys requires data reconstruction and
-- should be handled manually for safety in production.
