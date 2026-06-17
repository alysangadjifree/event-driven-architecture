# Panduan Menggunakan Simulasi EDA Fraud Detection

## Daftar Isi
1. [Prasyarat](#1-prasyarat)
2. [Menjalankan Simulasi](#2-menjalankan-simulasi)
3. [Navigasi Dashboard UI](#3-navigasi-dashboard-ui)
4. [Menggunakan Kafka UI](#4-menggunakan-kafka-ui)
5. [Menggunakan REST API](#5-menggunakan-rest-api)
6. [Menyesuaikan Konfigurasi](#6-menyesuaikan-konfigurasi)
7. [Melihat Log Service](#7-melihat-log-service)
8. [Menghentikan Simulasi](#8-menghentikan-simulasi)
9. [Troubleshooting](#9-troubleshooting)
10. [Menginspeksi DuckDB Secara Manual](#10-menginspeksi-duckdb-secara-manual)

---

## 1. Prasyarat

Pastikan sudah terinstal di laptop:

| Software | Versi Minimum | Cek dengan |
|---|---|---|
| Docker Desktop | 4.20 | `docker --version` |
| (opsional) Node.js | 20 | `node --version` |

Docker Desktop **harus dalam kondisi berjalan** (ikon di menu bar aktif) sebelum menjalankan simulasi.

---

## 2. Menjalankan Simulasi

### Pertama kali / setelah clone
```bash
# Masuk ke folder project
cd "event-driven-architecture"

# Jalankan semua service (build + start)
./scripts/start.sh
```

Script ini otomatis:
- Membuat file `.env` dari `.env.example`
- Menjalankan `docker compose up -d --build`
- Menampilkan URL semua service

> **Build pertama kali** membutuhkan ~3–5 menit karena mengunduh Docker images.
> Jalankan berikutnya jauh lebih cepat karena sudah ter-cache.

### Cek semua container berjalan

```bash
docker compose ps
```

Output yang diharapkan — semua berstatus `Up`:

```
NAME                  STATUS
eda-kafka             Up (healthy)
eda-kafka-ui          Up
eda-generator         Up
eda-fraud-detector    Up
eda-backend           Up
eda-frontend          Up
```

Jika status `kafka` belum `healthy`, tunggu 20–30 detik lagi — Kafka butuh waktu warm-up.

---

## 3. Navigasi Dashboard UI

Buka browser → **http://localhost:5173**

```
┌─────────────────────────────────────────────────────────────────┐
│  BPJS Fraud Detection             ● Terhubung                   │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ Total        │ Fraud        │ Nilai        │ Throughput         │
│ Transaksi    │ Terdeteksi   │ Berisiko     │                    │
│   1.240      │    87        │ Rp 312Jt     │ 2.0 event/dtk      │
├──────────────┴──────────────┴──────────────┴────────────────────┤
│                    GRAFIK TREN (per menit)                       │
│  ▲                                                              │
│  │  ████                                                        │
│  │  ████  ██                                                    │
│  └────────────────────────────────────────────────────────────  │
├────────────────────────────┬────────────────────────────────────┤
│  LIVE FEED KLAIM           │  FRAUD ALERTS                      │
│  ──────────────────────    │  ──────────────────────────────    │
│  abc123 · BPJS-000042      │  [HIGH] Frekuensi Tinggi           │
│    PRCS-HT-01 · Rp45K      │  BPJS-000001 · 6 klaim/jam        │
│  def456 · BPJS-000017      │                                    │
│    PRCS-DM-02 · Rp75K      │  [MEDIUM] Amount Abnormal         │
│  ...                       │  BPJS-000033 · 4.1× median        │
├────────────────────────────┴────────────────────────────────────┤
│  ● DuckDB Analytics — Data Persisten                            │
│  ┌───────────────┬───────────────┬───────────────┐             │
│  │ Claims        │ Alert         │ Total Nilai    │             │
│  │ Tersimpan     │ Tersimpan     │ Fraud          │             │
│  │   1.240       │    72         │ Rp 284Jt       │             │
│  └───────────────┴───────────────┴───────────────┘             │
│  ┌──────────────────────────┐ ┌────────────────────────────┐   │
│  │ Fraud per Wilayah        │ │ Fraud per Jenis Rule        │   │
│  │ ▐██ DKI Jakarta   31     │ │ [HIGH]   Frekuensi Tinggi 28│   │
│  │ ▐█  Jawa Barat    22     │ │ [HIGH]   Duplikat          19│   │
│  │ ▐█  Jawa Timur    19     │ │ [MEDIUM] Amt Abnormal      15│   │
│  └──────────────────────────┘ └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Penjelasan Setiap Bagian

#### Indikator Koneksi (pojok kanan atas)
- **Titik hijau "Terhubung"** → WebSocket aktif, data mengalir real-time
- **Titik merah "Memulihkan koneksi..."** → koneksi terputus, otomatis reconnect dalam 3 detik

#### 4 Kartu Metrik
| Kartu | Isi | Keterangan |
|---|---|---|
| Total Transaksi | Jumlah klaim sejak service start | Terus bertambah |
| Fraud Terdeteksi | Jumlah klaim yang memicu ≥1 aturan fraud | Angka + % dari total |
| Nilai Berisiko | Total Rupiah dari klaim fraud | Akumulasi |
| Throughput | Event per detik saat ini | Sesuai `EVENTS_PER_SECOND` di `.env` |

#### Grafik Tren
- **Garis biru** = jumlah klaim per menit
- **Garis merah** = jumlah fraud terdeteksi per menit
- Sumbu X = waktu (30 menit terakhir)
- Hover di atas grafik untuk melihat nilai tepat per menit

#### Live Feed Klaim (panel kiri bawah)
Setiap baris menampilkan:
```
[ID pendek]  [peserta_id]  ·  [kode prosedur]  [nilai klaim]  [provinsi]
```
Scroll ke bawah untuk melihat klaim yang lebih lama. Disimpan 50 klaim terbaru.

#### Fraud Alerts (panel kanan bawah)
Setiap alert menampilkan:
- **Badge merah `HIGH`** atau **kuning `MEDIUM`** = tingkat keparahan
- Label aturan yang terpicu: Duplikat / Amount Abnormal / Frekuensi Tinggi / Diagnosis Tdk Konsisten / Lonjakan Faskes
- Penjelasan singkat kenapa terdeteksi
- Bisa ada beberapa badge sekaligus jika 1 klaim memicu >1 aturan

#### DuckDB Analytics (panel bawah — persisten)
Panel ini menampilkan data yang tersimpan di DuckDB dan **tidak hilang** meski backend di-restart:
- **3 summary card**: jumlah claims tersimpan, jumlah alert tersimpan, total nilai fraud
- **Bar chart**: fraud count per wilayah (provinsi) — diurutkan dari terbanyak
- **Tabel rule**: daftar jenis aturan fraud dengan badge severity dan jumlah kejadian

> Panel ini update setiap **10 detik** via WebSocket, dan juga di-load saat halaman pertama kali dibuka.

---

## 4. Menggunakan Kafka UI

Buka browser → **http://localhost:8080**

### Melihat Event Klaim Masuk

1. Klik **Topics** di menu kiri
2. Pilih topik **`claims`**
3. Klik tab **Messages**
4. Event klaim akan muncul secara real-time

Setiap message menampilkan:
- **Key**: `peserta_id` (misal: `BPJS-000042`)
- **Value**: JSON lengkap event klaim
- **Offset**: nomor urut event dalam partition
- **Timestamp**: waktu event dikirim

### Melihat Fraud Alerts

1. Pilih topik **`fraud-alerts`**
2. Tab **Messages** — hanya event yang memicu fraud yang muncul di sini

### Melihat Consumer Groups

1. Klik **Consumer Groups** di menu kiri
2. Ada 2 group aktif:
   - `fraud-detector-group` — Fraud Detector sedang baca topik `claims`
   - `backend-consumer-group` — Backend API sedang baca `claims` + `fraud-alerts`
3. **Lag** = selisih antara offset terbaru dan offset yang sudah dibaca — idealnya mendekati 0

### Memfilter / Mencari Event

Di halaman Messages topik, kamu bisa:
- **Filter by offset**: masuk ke offset tertentu
- **Search by content**: cari teks dalam value JSON

---

## 5. Menggunakan REST API

Backend menyediakan endpoint untuk query data tanpa membuka dashboard.

### Statistik Keseluruhan
```bash
curl http://localhost:3001/api/stats
```
Contoh response:
```json
{
  "totalClaims": 1240,
  "totalFraud": 87,
  "totalRiskAmount": 312500000,
  "throughput": 2.00,
  "uptimeSeconds": 620,
  "trend": [
    { "minute": "09:10", "claims": 12, "fraud": 1 },
    { "minute": "09:11", "claims": 11, "fraud": 2 }
  ]
}
```

### 50 Klaim Terbaru
```bash
curl http://localhost:3001/api/recent-claims
```

### 50 Fraud Alert Terbaru
```bash
curl http://localhost:3001/api/recent-alerts
```

### Health Check
```bash
curl http://localhost:3001/health
# → {"status":"ok"}
```

### Analytics DuckDB — Summary Keseluruhan
```bash
curl http://localhost:3001/api/analytics/summary
```
Contoh response:
```json
{
  "totalClaims": 1240,
  "totalAlerts": 72,
  "totalRiskAmount": 284500000,
  "byRegion": [
    { "region": "DKI Jakarta", "count": 31 },
    { "region": "Jawa Barat",  "count": 22 }
  ],
  "byRule": [
    { "rule_name": "high_frequency",   "severity": "HIGH",   "count": 28 },
    { "rule_name": "duplicate_claim",  "severity": "HIGH",   "count": 19 },
    { "rule_name": "abnormal_amount",  "severity": "MEDIUM", "count": 15 }
  ]
}
```

### Analytics DuckDB — Per Wilayah
```bash
curl http://localhost:3001/api/analytics/by-region
```

### Analytics DuckDB — Per Jenis Rule
```bash
curl http://localhost:3001/api/analytics/by-rule
```

### Format Output yang Rapi (butuh Python)
```bash
curl -s http://localhost:3001/api/analytics/summary | python3 -m json.tool
```

---

## 6. Menyesuaikan Konfigurasi

Edit file `.env` di root folder project, lalu restart service yang terdampak.

### Mengubah Kecepatan Event

```bash
# Di file .env:
EVENTS_PER_SECOND=5    # dari 2 → 5 event per detik
```

```bash
# Restart generator saja (tidak perlu restart Kafka):
docker compose restart generator
```

### Mengubah Proporsi Fraud

```bash
# Di file .env:
ANOMALY_RATIO=0.30    # 30% event akan anomali (default: 0.12)
```

```bash
docker compose restart generator
```

### Tabel Referensi Konfigurasi

| Variabel | Default | Efek |
|---|---|---|
| `EVENTS_PER_SECOND` | `2` | Kecepatan event klaim |
| `ANOMALY_RATIO` | `0.12` | Proporsi event anomali (0.0–1.0) |
| `KAFKA_UI_PORT` | `8080` | Port Kafka UI di browser |
| `BACKEND_PORT` | `3001` | Port Backend API |
| `FRONTEND_PORT` | `5173` | Port Dashboard |

---

## 7. Melihat Log Service

### Semua service sekaligus
```bash
docker compose logs -f
```
Tekan `Ctrl+C` untuk berhenti.

### Per service (lebih fokus)

```bash
# Lihat event yang dikirim Generator
docker compose logs -f generator
```
```
[generator] 10 klaim terkirim | terakhir: abc-123 | anomali: false
[generator] 20 klaim terkirim | terakhir: def-456 | anomali: true
```

```bash
# Lihat alert yang terdeteksi Fraud Detector
docker compose logs -f fraud-detector
```
```
[fraud-detector] ALERT! claim=def-456 | aturan: high_frequency
[fraud-detector] Diproses: 50 klaim, 6 alerts
```

```bash
# Lihat koneksi WebSocket ke Backend
docker compose logs -f backend
```
```
[backend] WebSocket client terhubung (1 total)
[backend] HTTP + WebSocket server berjalan di port 3001
```

---

## 8. Menghentikan Simulasi

### Hentikan semua container (data Kafka + DuckDB tetap tersimpan)
```bash
./scripts/stop.sh
```
Data di Docker volume (`kafka_data` dan `duckdb_data`) tetap ada. Jalankan lagi dengan `./scripts/start.sh` dan data lanjut dari sebelumnya.

### Hentikan DAN hapus semua data
```bash
docker compose down -v
```
> Gunakan ini jika ingin memulai dari awal bersih — counter reset, history Kafka terhapus, **dan data DuckDB ikut terhapus**.

### Hapus hanya data DuckDB (Kafka tetap)
```bash
docker volume rm event-driven-architecture_duckdb_data
```

### Restart satu service tertentu
```bash
docker compose restart generator       # restart generator saja
docker compose restart fraud-detector  # restart fraud detector saja
docker compose restart backend         # restart backend (DuckDB data tetap ada)
```

---

## 9. Troubleshooting

### Dashboard tidak menampilkan data / koneksi merah

**Cek**: apakah Backend berjalan?
```bash
curl http://localhost:3001/health
```
Jika tidak ada response, cek log backend:
```bash
docker compose logs backend
```

**Cek**: apakah Kafka sudah healthy?
```bash
docker compose ps kafka
```
Tunggu hingga status `(healthy)` muncul (~30 detik setelah start).

---

### Error `manifest unknown` saat docker compose up

Docker tidak bisa mengunduh image. Kemungkinan penyebab:
1. **Docker Desktop belum jalan** — buka Docker Desktop, tunggu sampai ikon di menu bar aktif
2. **Masalah jaringan** — coba matikan VPN jika aktif

---

### Container `generator` atau `fraud-detector` langsung exit

Kafka belum siap saat service mencoba connect. Coba:
```bash
docker compose restart generator fraud-detector
```

---

### Port sudah dipakai (error `bind: address already in use`)

Ubah port di file `.env`, contoh:
```
KAFKA_UI_PORT=8081
BACKEND_PORT=3002
```
Lalu restart:
```basht
docker compose down && ./scripts/start.sh
```

---

### Kafka UI tidak menampilkan topik

Topik baru terbuat otomatis setelah Generator mengirim event pertama. Tunggu 10–15 detik setelah `start.sh`, lalu refresh halaman Kafka UI.

---

### Reset total (mulai dari nol)

```bash
docker compose down -v    # hapus semua container + volume data (Kafka + DuckDB)
./scripts/start.sh        # build ulang dan jalankan
```

---

### Panel DuckDB Analytics tidak muncul / kosong

**Cek**: apakah data sudah mulai masuk (tunggu ~15 detik setelah start)?

```bash
curl http://localhost:3001/api/analytics/summary
```

Jika response `{ "totalClaims": 0, ... }`, berarti DuckDB belum menerima data. Pastikan generator berjalan:

```bash
docker compose logs generator
```

**Cek**: apakah backend berhasil inisialisasi DuckDB?
```bash
docker compose logs backend | grep duckdb
# Harus ada: "[duckdb] Database ready: /var/lib/duckdb/fraud.db"
```

Jika ada error seperti `Cannot find module 'duckdb'`, coba build ulang backend:
```bash
docker compose build backend && docker compose restart backend
```

---

## 10. Menginspeksi DuckDB Secara Manual

Kamu bisa masuk ke container backend dan query DuckDB langsung menggunakan Node.js REPL:

```bash
# Masuk ke shell container backend
docker exec -it eda-backend sh

# Jalankan Node.js REPL
node
```

Kemudian di dalam REPL:
```javascript
const duckdb = require('duckdb');
const db = new duckdb.Database('/var/lib/duckdb/fraud.db');
const conn = new duckdb.Connection(db);

// Hitung total klaim
conn.all('SELECT COUNT(*) AS total FROM claims', (err, rows) => console.log(rows));

// Fraud per wilayah
conn.all('SELECT region, COUNT(*) AS n FROM fraud_alerts GROUP BY region ORDER BY n DESC', (err, rows) => console.log(rows));

// 5 klaim terbaru
conn.all('SELECT claim_id, peserta_id, claim_amount, inserted_at FROM claims ORDER BY inserted_at DESC LIMIT 5', (err, rows) => console.log(rows));
```

Tekan `Ctrl+D` untuk keluar dari REPL, lalu `exit` untuk keluar dari container.
