# EDA Fraud Detection — Simulasi Real-Time BPJS Kesehatan

Simulasi **end-to-end fraud detection real-time** berbasis Event-Driven Architecture (EDA) dengan Apache Kafka, mengacu pada pola transaksi klaim layanan kesehatan nasional (BPJS Kesehatan / JKN).

```
[Generator]  →  Kafka: claims  →  [Fraud Detector]  →  Kafka: fraud-alerts
                                                                 ↓
                                          [Backend API + WebSocket]  →  [Dashboard UI]
```

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

### 3. Buka di browser

| Service | URL |
|---|---|
| **Dashboard UI** | http://localhost:5173 |
| **Kafka UI** | http://localhost:8080 |
| **Backend API** | http://localhost:3001/api/stats |

### 4. Berhenti
```bash
./scripts/stop.sh
```

> Untuk menghapus semua data Kafka juga: `docker compose down -v`

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
- REST API: `GET /api/stats`, `GET /api/recent-claims`, `GET /api/recent-alerts`
- WebSocket di port 3001 untuk push real-time ke dashboard

### 4. Dashboard UI (`/frontend`)
- React + Vite + Recharts + Tailwind CSS
- Live feed transaksi & fraud alerts
- Grafik tren & kartu metrik real-time

---

## Aturan Deteksi Fraud

| Rule | Logika |
|---|---|
| `duplicate_claim` | `peserta_id + procedure_code + service_date` sama dalam window 5 menit |
| `abnormal_amount` | `claim_amount > 3× median` historis per `procedure_code` |
| `high_frequency` | `peserta_id` mengajukan > 5 klaim dalam 1 jam |
| `inconsistent_diagnosis` | `procedure_code` tidak valid untuk `diagnosis_code` berdasarkan mapping ICD-10 |
| `faskes_spike` | Satu `faskes_id` volume klaim > 3× baseline dalam 10 menit |

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
├── scripts/
│   ├── start.sh
│   └── stop.sh
├── generator/          # Transaction Generator (Node.js + KafkaJS)
├── fraud-detector/     # Fraud Detector (Node.js + KafkaJS)
├── backend/            # API + WebSocket (Express + ws)
└── frontend/           # Dashboard (React + Vite + Recharts)
```
