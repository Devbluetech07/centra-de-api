#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/security-clean-git-env.sh main
# Default branch: main
BRANCH="${1:-main}"

echo "[1/8] Verificando repositório Git..."
git rev-parse --is-inside-work-tree >/dev/null

echo "[2/8] Garantindo .env no .gitignore..."
if ! grep -qxF ".env" .gitignore; then
  echo ".env" >> .gitignore
fi
if ! grep -qxF "!.env.example" .gitignore; then
  echo "!.env.example" >> .gitignore
fi

echo "[3/8] Removendo .env do índice atual..."
git rm --cached --ignore-unmatch .env || true

echo "[4/8] Reescrevendo histórico para remover .env..."
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

echo "[5/8] Limpando refs antigas e garbage collection..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "[6/8] Commitando proteções locais..."
git add .gitignore .env.example
git commit -m "security: remove .env from tracking and keep sanitized env example" || true

echo "[7/8] Forçando push para remoto..."
git push origin --force --all
git push origin --force --tags

echo "[8/8] Gerando novas credenciais fortes..."
echo "JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
echo "DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')"

echo
echo "IMPORTANTE: todas as credenciais antigas devem ser consideradas comprometidas e revogadas."
