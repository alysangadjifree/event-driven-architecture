# EDA Fraud Detection — Simulasi Real-Time BPJS Kesehatan

Simulasi **end-to-end fraud detection real-time** berbasis Event-Driven Architecture (EDA) dengan Apache Kafka dan DuckDB, mengacu pada pola transaksi klaim layanan kesehatan nasional (BPJS Kesehatan / JKN).

```
[Generator]  →  Kafka: claims  →  [Fraud Detector]  →  Kafka: fraud-alerts
                                                                 ↓
                                          [Backend API + WebSocket]  →  [Dashboard UI]
                                                    ↓
                                               [DuckDB]  →  Analytics + DB Explorer
```

---

## Fitur Utama

| Fitur | Keterangan |
|---|---|
| **Real-time Fraud Detection** | 5 aturan fraud berjalan per event, latensi < 500ms end-to-end |
| **Live Dashboard** | WebSocket push — feed klaim, fraud alerts, grafik tren per menit |
| **DuckDB Analytics Sink** | Setiap klaim & alert disimpan persisten ke DuckDB (survive restart) |
| **Analytics Panel** | Bar chart fraud per wilayah, breakdown per rule dengan progress bar |
| **DB Explorer** | Query SQL langsung ke DuckDB dari browser, schema browser, 5 preset query |

---

## Prasyarat

| Tool | Versi Minimum |
|---|---|
| Docker Desktop | 4.20 |
| Node.js | 20 (opsional, hanya untuk dev lokal di luar Docker) |

---

## Cara Menjalankan

### 1. Clone dan masuk ke folder
```bash
git clone <repo-url> event-driven-architecture
cd event-driven-architecture
```

### 2. Jalankan semua service
```bash
./scripts/start.sh
```

Script ini otomatis membuat `.env` dari `.env.example` dan menjalankan `docker compose up -d --build`.

> **Build pertama kali** membutuhkan ~5–8 menit karena mengunduh image dan mengkompilasi native addon DuckDB.

### 3. Buka di browser

| Service | URL |
|---|---|
| **Dashboard UI** | http://localhost:5173 |
| **Kafka UI** | http://localhost:8080 |
| **Backend API** | http://localhost:3001/api/stats |
| **Analytics API** | http://localhost:3001/api/analytics/summary |

### 4. Berhenti
```bash
./scripts/stop.sh
```

> Data Kafka **dan** DuckDB tetap tersimpan setelah stop. Untuk hapus semua: `docker compose down -v`

---

## Konfigurasi

Edit file `.env` untuk menyesuaikan:

| Variabel | Default | Keterangan |
|---|---|---|
| `EVENTS_PER_SECOND` | `2` | Jumlah event klaim per detik |
| `ANOMALY_RATIO` | `0.12` | Proporsi event anomali (0.0 – 1.0) |
| `KAFKA_UI_PORT` | `8080` | Port Kafka UI |
| `BACKEND_PORT` | `3001` | Port Backend API |
| `FRONTEND_PORT` | `5173` | Port Dashboard |

---

## Arsitektur Service

### 1. Generator (`/generator`)
- Menghasilkan event klaim dummy secara terus-menerus
- ~12% event sengaja dibuat anomali untuk memicu aturan fraud
- Publish ke Kafka topik `claims`

### 2. Fraud Detector (`/fraud-detector`)
- Consume topik `claims`
- Menjalankan 5 aturan fraud (lihat di bawah)
- Publish alert ke topik `fraud-alerts`

### 3. Backend API (`/backend`)
- Consume kedua topik Kafka
- Tulis setiap event ke **DuckDB** secara async (persistent sink)
- REST API: stats, recent claims/alerts, analytics, SQL query endpoint
- WebSocket di port 3001 untuk push real-time ke dashboard

### 4. DuckDB (`embedded di backend`)
- Database analitik embedded — tidak perlu container terpisah
- Tabel: `claims` dan `fraud_alerts`
- Data tersimpan di Docker volume `duckdb_data` (survive restart)
- Diquery via `GET /api/analytics/*` dan `POST /api/analytics/query`

### 5. Dashboard UI (`/frontend`)
- React + Vite + Recharts + Tailwind CSS
- Live feed transaksi & fraud alerts (scroll 50 item)
- Grafik tren per menit & kartu metrik real-time
- **Analytics Panel** — data historis dari DuckDB (update tiap 10 detik)
- **DB Explorer** — SQL query UI dengan schema browser dan preset query

---

## Aturan Deteksi Fraud

| Rule | Severity | Logika |
|---|---|---|
| `duplicate_claim` | HIGH | `peserta_id + procedure_code + service_date` sama dalam window 5 menit |
| `abnormal_amount` | MEDIUM | `claim_amount > 3× median` historis per `procedure_code` |
| `high_frequency` | HIGH | `peserta_id` mengajukan > 5 klaim dalam 1 jam |
| `inconsistent_diagnosis` | MEDIUM | `procedure_code` tidak valid untuk `diagnosis_code` (mapping ICD-10) |
| `faskes_spike` | HIGH | Satu `faskes_id` volume klaim > 3× baseline dalam 10 menit |

---

## REST API

```bash
# Statistik real-time (in-memory)
GET /api/stats
GET /api/recent-claims
GET /api/recent-alerts

# Analytics dari DuckDB
GET  /api/analytics/summary
GET  /api/analytics/by-region
GET  /api/analytics/by-rule
GET  /api/analytics/schema

# SQL Explorer (hanya SELECT)
POST /api/analytics/query
     body: { "sql": "SELECT * FROM claims LIMIT 10" }
```

---

## DB Explorer

Klik tombol **"▶ DB Explorer"** di header dashboard untuk membuka SQL explorer:

- **Schema browser** — klik nama tabel/kolom untuk insert ke query
- **Preset queries** — 10 Klaim Terbaru, 10 Alert Terbaru, Fraud per Wilayah, Fraud per Rule, Klaim Anomali
- **SQL textarea** — tulis query manual, `Ctrl+Enter` untuk jalankan
- **Hasil** — tabel scrollable dengan jumlah baris dan waktu eksekusi
- Hanya query `SELECT / SHOW / DESCRIBE` yang diizinkan

---

## Melihat Event di Kafka UI

1. Buka http://localhost:8080
2. Pilih cluster **local**
3. Masuk ke **Topics** → pilih `claims` atau `fraud-alerts`
4. Tab **Messages** — event mengalir secara real-time

---

## Struktur Folder

```
event-driven-architecture/
├── docker-compose.yml
├── .env.example
├── README.md
├── ARSITEKTUR.md       # Dokumentasi arsitektur lengkap
├── PANDUAN.md          # Panduan penggunaan lengkap
├── scripts/
│   ├── start.sh
│   └── stop.sh
├── generator/          # Transaction Generator (Node.js + KafkaJS)
├── fraud-detector/     # Fraud Detector (Node.js + KafkaJS)
├── backend/            # API + WebSocket + DuckDB (Express + ws + duckdb)
└── frontend/           # Dashboard (React + Vite + Recharts + Tailwind)
```
