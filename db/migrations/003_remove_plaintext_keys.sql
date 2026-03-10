-- UP
ALTER TABLE chaves_api DROP COLUMN IF EXISTS token_plano;

-- DOWN
ALTER TABLE chaves_api ADD COLUMN IF NOT EXISTS token_plano TEXT;
