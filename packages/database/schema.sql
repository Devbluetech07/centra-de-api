CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'manager', 'operator', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE doc_side AS ENUM ('front', 'back', 'single');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE doc_type AS ENUM ('rg', 'cnh', 'cnh_digital', 'passport');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('draft', 'sent', 'in_progress', 'completed', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE field_type AS ENUM ('text', 'signature', 'initials', 'date', 'number', 'checkbox', 'multiple', 'radio', 'cells', 'stamp');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE signatory_status AS ENUM ('pending', 'viewed', 'signed', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE signature_type AS ENUM ('drawn', 'typed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE signing_order AS ENUM ('parallel', 'sequential');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  cnpj VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  logo_url TEXT,
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  department_ids UUID[] DEFAULT '{}'::uuid[],
  monitor_department_ids UUID[] DEFAULT '{}'::uuid[],
  permissions_json JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_first_login BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  parent_id UUID REFERENCES folders(id),
  name VARCHAR NOT NULL,
  color VARCHAR,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  content_json JSONB,
  default_message TEXT,
  pdf_path TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  folder_id UUID REFERENCES folders(id),
  template_id UUID REFERENCES templates(id),
  title VARCHAR NOT NULL,
  message TEXT,
  status document_status DEFAULT 'draft',
  signing_order_type signing_order DEFAULT 'parallel',
  pdf_original_path TEXT,
  pdf_signed_path TEXT,
  security_pdf_path TEXT,
  deadline_at TIMESTAMPTZ,
  reminder_days INT DEFAULT 3,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  cpf VARCHAR,
  company VARCHAR,
  role VARCHAR,
  notes TEXT,
  default_validations_json JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signatories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  contact_id UUID REFERENCES contacts(id),
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  order_index INT DEFAULT 0,
  status signatory_status DEFAULT 'pending',
  validations_json JSONB DEFAULT '{}'::jsonb,
  token UUID DEFAULT gen_random_uuid(),
  token_expires_at TIMESTAMPTZ,
  ip_address VARCHAR,
  user_agent TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  signatory_id UUID,
  type field_type NOT NULL,
  page INT NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  required BOOLEAN DEFAULT true,
  value_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  signatory_id UUID NOT NULL REFERENCES signatories(id),
  type signature_type NOT NULL,
  image_path TEXT NOT NULL,
  hash VARCHAR,
  ip VARCHAR,
  user_agent TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  signed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signatory_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  signatory_id UUID NOT NULL REFERENCES signatories(id),
  doc_type doc_type NOT NULL,
  side doc_side NOT NULL,
  file_path TEXT NOT NULL,
  file_hash VARCHAR,
  ip VARCHAR,
  user_agent TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS selfies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  signatory_id UUID NOT NULL REFERENCES signatories(id),
  image_path TEXT NOT NULL,
  bluepoint_score NUMERIC,
  bluepoint_status VARCHAR,
  ip VARCHAR,
  latitude NUMERIC,
  longitude NUMERIC,
  captured_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS selfie_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  signatory_id UUID NOT NULL REFERENCES signatories(id),
  image_path TEXT NOT NULL,
  file_hash VARCHAR,
  bluepoint_score NUMERIC,
  bluepoint_status VARCHAR DEFAULT 'pending',
  face_detected BOOLEAN DEFAULT false,
  document_detected BOOLEAN DEFAULT false,
  ip VARCHAR,
  user_agent TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  captured_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  token_hash VARCHAR NOT NULL,
  scopes TEXT[] DEFAULT '{}'::text[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event VARCHAR NOT NULL,
  org_id UUID REFERENCES organizations(id),
  document_id UUID REFERENCES documents(id),
  signatory_id UUID REFERENCES signatories(id),
  user_id UUID,
  ip VARCHAR,
  user_agent TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  payload_hash VARCHAR,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  org_id UUID REFERENCES organizations(id),
  type VARCHAR,
  title VARCHAR,
  message TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facial_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signatory_id UUID NOT NULL REFERENCES signatories(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  source VARCHAR NOT NULL,
  embedding vector(512) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_org_status ON documents(org_id, status);
CREATE INDEX IF NOT EXISTS idx_signatories_doc_status ON signatories(document_id, status);
CREATE INDEX IF NOT EXISTS idx_api_tokens_org_active ON api_tokens(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facial_embeddings_hnsw ON facial_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatory_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE selfie_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY organizations_read ON organizations FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY api_tokens_read ON api_tokens FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Padrao PT-BR (producao): tabelas operacionais em portugues
-- Mantemos views em ingles apenas para retrocompatibilidade temporaria.
-- ============================================================================
DO $$
BEGIN
  IF to_regclass('public.organizacoes') IS NULL AND to_regclass('public.organizations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE organizations RENAME TO organizacoes';
  END IF;
  IF to_regclass('public.documentos') IS NULL AND to_regclass('public.documents') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE documents RENAME TO documentos';
  END IF;
  IF to_regclass('public.signatarios') IS NULL AND to_regclass('public.signatories') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE signatories RENAME TO signatarios';
  END IF;
  IF to_regclass('public.assinaturas') IS NULL AND to_regclass('public.signatures') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE signatures RENAME TO assinaturas';
  END IF;
  IF to_regclass('public.documentos_signatario') IS NULL AND to_regclass('public.signatory_documents') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE signatory_documents RENAME TO documentos_signatario';
  END IF;
  IF to_regclass('public.selfies_documentos') IS NULL AND to_regclass('public.selfie_documents') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE selfie_documents RENAME TO selfies_documentos';
  END IF;
  IF to_regclass('public.tokens_api') IS NULL AND to_regclass('public.api_tokens') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE api_tokens RENAME TO tokens_api';
  END IF;
  IF to_regclass('public.logs_auditoria') IS NULL AND to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE audit_logs RENAME TO logs_auditoria';
  END IF;
END $$;

CREATE OR REPLACE VIEW organizations AS SELECT * FROM organizacoes;
CREATE OR REPLACE VIEW documents AS SELECT * FROM documentos;
CREATE OR REPLACE VIEW signatories AS SELECT * FROM signatarios;
CREATE OR REPLACE VIEW signatures AS SELECT * FROM assinaturas;
CREATE OR REPLACE VIEW signatory_documents AS SELECT * FROM documentos_signatario;
CREATE OR REPLACE VIEW selfie_documents AS SELECT * FROM selfies_documentos;
CREATE OR REPLACE VIEW api_tokens AS SELECT * FROM tokens_api;
CREATE OR REPLACE VIEW audit_logs AS SELECT * FROM logs_auditoria;

DO $$
BEGIN
  IF to_regclass('public.assinaturas') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE assinaturas ADD COLUMN IF NOT EXISTS image_path_sem_marca TEXT';
    EXECUTE 'ALTER TABLE assinaturas ADD COLUMN IF NOT EXISTS image_path_com_marca TEXT';
  ELSIF to_regclass('public.signatures') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE signatures ADD COLUMN IF NOT EXISTS image_path_sem_marca TEXT';
    EXECUTE 'ALTER TABLE signatures ADD COLUMN IF NOT EXISTS image_path_com_marca TEXT';
  END IF;

  IF to_regclass('public.documentos_signatario') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE documentos_signatario ADD COLUMN IF NOT EXISTS ip VARCHAR';
    EXECUTE 'ALTER TABLE documentos_signatario ADD COLUMN IF NOT EXISTS user_agent TEXT';
    EXECUTE 'ALTER TABLE documentos_signatario ADD COLUMN IF NOT EXISTS latitude NUMERIC';
    EXECUTE 'ALTER TABLE documentos_signatario ADD COLUMN IF NOT EXISTS longitude NUMERIC';
  ELSIF to_regclass('public.signatory_documents') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE signatory_documents ADD COLUMN IF NOT EXISTS ip VARCHAR';
    EXECUTE 'ALTER TABLE signatory_documents ADD COLUMN IF NOT EXISTS user_agent TEXT';
    EXECUTE 'ALTER TABLE signatory_documents ADD COLUMN IF NOT EXISTS latitude NUMERIC';
    EXECUTE 'ALTER TABLE signatory_documents ADD COLUMN IF NOT EXISTS longitude NUMERIC';
  END IF;
END $$;
