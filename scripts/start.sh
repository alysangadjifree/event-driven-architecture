#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Salin .env root jika belum ada
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[setup] File .env dibuat dari .env.example"
fi

# Salin .env frontend jika belum ada (untuk VITE_WS_URL)
if [ ! -f frontend/.env ]; then
  cp frontend/.env.example frontend/.env
  echo "[setup] File frontend/.env dibuat"
fi

echo "[start] Menjalankan semua service..."
docker compose up -d --build

echo ""
echo "=== Service berjalan ==="
echo "  Kafka UI    : http://localhost:${KAFKA_UI_PORT:-8080}"
echo "  Backend API : http://localhost:${BACKEND_PORT:-3001}"
echo "  Dashboard   : http://localhost:${FRONTEND_PORT:-5173}"
echo ""
echo "Untuk melihat log: docker compose logs -f"
echo "Untuk berhenti  : ./scripts/stop.sh"
