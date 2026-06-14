#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[stop] Menghentikan semua service..."
docker compose down

echo "[stop] Selesai. Data Kafka tetap tersimpan di volume 'kafka_data'."
echo "       Untuk menghapus data juga: docker compose down -v"
