#!/bin/sh
# Deploy SuperMovie to the VPS over Tailscale.
# Usage:  VPS_USER=me VPS_HOST=machine-name tailnet.ts.net ./scripts/deploy.sh
set -e

VPS_USER="${VPS_USER:?set VPS_USER (your VPS username)}"
VPS_HOST="${VPS_HOST:?set VPS_HOST (the VPS tailnet name or 100.x IP)}"
VPS_DIR="${VPS_DIR:-superapp}"

echo "==> Syncing code to $VPS_USER@$VPS_HOST:$VPS_DIR"
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude "src/generated" \
  --exclude .env \
  --exclude "*.sql.gz" \
  ./ "$VPS_USER@$VPS_HOST:$VPS_DIR/"

echo "==> Rebuilding and restarting containers"
ssh -t "$VPS_USER@$VPS_HOST" "cd $VPS_DIR && docker compose up -d --build"

echo "==> Done. App serves on the VPS at localhost:3000 (via tailscale serve)."
