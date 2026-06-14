# Dokumentasi Arsitektur: EDA Fraud Detection BPJS Kesehatan

## Daftar Isi
1. [Apa itu Event-Driven Architecture?](#1-apa-itu-event-driven-architecture)
2. [Konsep Dasar Apache Kafka](#2-konsep-dasar-apache-kafka)
3. [Gambaran Arsitektur Sistem](#3-gambaran-arsitektur-sistem)
4. [Alur Data End-to-End](#4-alur-data-end-to-end)
5. [Penjelasan Setiap Komponen](#5-penjelasan-setiap-komponen)
6. [Model Data: Struktur Event Klaim](#6-model-data-struktur-event-klaim)
7. [Cara Kerja Setiap Aturan Deteksi Fraud](#7-cara-kerja-setiap-aturan-deteksi-fraud)
8. [Cara Kerja Dashboard Real-Time](#8-cara-kerja-dashboard-real-time)
9. [Perbandingan: EDA vs Sistem Tradisional](#9-perbandingan-eda-vs-sistem-tradisional)

---

## 1. Apa itu Event-Driven Architecture?

**Event-Driven Architecture (EDA)** adalah pola desain sistem di mana komponen-komponen berkomunikasi melalui **event** (kejadian) — bukan dengan saling memanggil satu sama lain secara langsung.

### Analogi Sederhana

Bayangkan kamu berlangganan newsletter:
- Kamu **tidak perlu menelepon** penerbit setiap hari untuk tanya "ada berita baru?"
- Penerbit **menerbitkan** berita, dan kamu **otomatis menerima** karena sudah berlangganan
- Ini yang disebut pola **Publish-Subscribe (Pub/Sub)**

```
Sistem Tradisional (Request-Response):
  ┌─────────┐   "ada fraud?"   ┌─────────────┐
  │ Backend │ ──────────────► │ Fraud Svc   │
  │         │ ◄────────────── │             │
  └─────────┘   "ya/tidak"    └─────────────┘
  → Harus menunggu jawaban sebelum lanjut

Sistem EDA (Publish-Subscribe):
  ┌───────────┐  "klaim masuk!"  ┌─────────┐
  │ Generator │ ───────────────► │  Kafka  │ ──► Fraud Detector (otomatis)
  └───────────┘    (publish)     │ (event  │ ──► Backend API    (otomatis)
                                 │  store) │ ──► Audit Logger   (bisa ditambah)
                                 └─────────┘
  → Semua penerima bereaksi secara bersamaan, tanpa saling menunggu
```

### Keunggulan EDA untuk Fraud Detection
| Keunggulan | Penjelasan |
|---|---|
| **Real-time** | Event langsung diproses saat tiba, bukan secara batch |
| **Decoupled** | Generator tidak tahu siapa yang menerima event-nya |
| **Scalable** | Bisa tambah consumer baru tanpa mengubah producer |
| **Resilient** | Kafka menyimpan event; consumer bisa replay jika crash |
| **Audit trail** | Semua event tersimpan, bisa dianalisis ulang |

---

## 2. Konsep Dasar Apache Kafka

Apache Kafka adalah **distributed event streaming platform** — sistem yang dirancang untuk menampung, menyimpan, dan meneruskan event dalam volume sangat besar dengan latensi rendah.

### 2.1 Broker

```
┌──────────────────────────────────────┐
│            KAFKA BROKER              │
│  (server pusat penyimpan event)      │
│                                      │
│  ┌────────────┐  ┌────────────────┐  │
│  │  Topic:    │  │  Topic:        │  │
│  │  claims    │  │  fraud-alerts  │  │
│  └────────────┘  └────────────────┘  │
└──────────────────────────────────────┘
```

**Broker** = server Kafka yang menerima, menyimpan, dan melayani event. Dalam proyek ini ada 1 broker (untuk simulasi; produksi biasanya 3+).

### 2.2 Topic

**Topic** = "saluran" atau "kategori" tempat event disimpan. Seperti folder di email — semua email tentang "tagihan" masuk ke folder yang sama.

```
Topic: claims
┌────────────────────────────────────────────────────────────────┐
│ [event_001] [event_002] [event_003] [event_004] ... [event_N]  │
│ ◄────────────── tersimpan berurutan (immutable log) ─────────► │
│   offset 0    offset 1    offset 2    offset 3         offset N │
└────────────────────────────────────────────────────────────────┘
```

- Event **tidak bisa dihapus** setelah masuk (immutable log)
- Setiap event punya **offset** (nomor urut) unik
- Default: event disimpan 7 hari (bisa dikonfigurasi)

Dalam proyek ini ada 2 topic:
- `claims` — semua event klaim masuk dari Generator
- `fraud-alerts` — event alert dari Fraud Detector

### 2.3 Partition

Setiap topic dibagi menjadi beberapa **partition** untuk paralelisme:

```
Topic: claims (3 partitions)
┌───────────────────┐
│ Partition 0:      │ ← event dari peserta A, D, G, ...
│ [e1][e4][e7]...   │
├───────────────────┤
│ Partition 1:      │ ← event dari peserta B, E, H, ...
│ [e2][e5][e8]...   │
├───────────────────┤
│ Partition 2:      │ ← event dari peserta C, F, I, ...
│ [e3][e6][e9]...   │
└───────────────────┘
```

Event dari `peserta_id` yang sama **selalu masuk ke partition yang sama** (karena kita pakai `peserta_id` sebagai key). Ini penting agar aturan fraud `duplicate_claim` dan `high_frequency` bisa bekerja dengan benar.

### 2.4 Producer

**Producer** = komponen yang **mengirim (publish)** event ke Kafka topic.

Dalam proyek ini: **Transaction Generator** adalah producer untuk topic `claims`. **Fraud Detector** adalah producer untuk topic `fraud-alerts`.

### 2.5 Consumer & Consumer Group

**Consumer** = komponen yang **membaca (subscribe)** event dari Kafka topic.

```
Topic: claims
[event_1][event_2][event_3][event_4][event_5]
    ↑                           ↑
    │                           │
Consumer A                  Consumer B
(Fraud Detector)            (Backend API)
offset: 3                   offset: 5

→ Masing-masing consumer punya "penanda posisi" (offset) sendiri
→ Consumer A sedang baca event_4 sementara Consumer B sudah di event_6
```

**Consumer Group** = sekumpulan consumer yang bekerja sama membaca topic yang sama, masing-masing membaca partition yang berbeda (untuk paralelisme).

```
Consumer Group: "fraud-detector-group"
  Consumer Instance 1 → baca Partition 0
  Consumer Instance 2 → baca Partition 1
  Consumer Instance 3 → baca Partition 2
```

### 2.6 KRaft Mode (tanpa Zookeeper)

Kafka versi lama butuh **Zookeeper** sebagai koordinator. Mulai Kafka 3.3+, ada mode **KRaft** (Kafka Raft) di mana Kafka mengkoordinasikan dirinya sendiri — lebih sederhana untuk di-deploy.

```
Mode Lama:
  [Kafka Broker] ──► [Zookeeper] (cluster metadata)

KRaft Mode (yang kita pakai):
  [Kafka Broker] ──► [Controller dalam Broker itu sendiri]
  → Satu container, lebih simpel
```

---

## 3. Gambaran Arsitektur Sistem

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    EDA Fraud Detection — BPJS Kesehatan                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌─────────────────┐                                                         ║
║  │  GENERATOR      │  Membuat event klaim dummy (~2/dtk)                     ║
║  │  (Node.js)      │  12% sengaja dibuat anomali                             ║
║  └────────┬────────┘                                                         ║
║           │ publish(claim_event)                                             ║
║           ▼                                                                  ║
║  ┌─────────────────────────────────────────────────────┐                    ║
║  │               APACHE KAFKA (KRaft)                  │                    ║
║  │                                                     │                    ║
║  │  Topic: claims          Topic: fraud-alerts         │                    ║
║  │  ┌─────────────────┐    ┌─────────────────────┐    │                    ║
║  │  │[c1][c2][c3]...  │    │[a1][a2][a3]...      │    │                    ║
║  │  └────────┬────────┘    └──────────┬──────────┘    │                    ║
║  └───────────┼─────────────────────────┼───────────────┘                    ║
║              │ subscribe               │ subscribe                           ║
║         ┌────┴────┐               ┌────┴────┐                               ║
║         │         │               │         │                               ║
║         ▼         ▼               └────►────┘                               ║
║  ┌──────────┐  ┌──────────┐            │                                    ║
║  │  FRAUD   │  │ BACKEND  │◄───────────┘                                    ║
║  │ DETECTOR │  │   API    │                                                  ║
║  │(Node.js) │  │(Node.js) │                                                  ║
║  └────┬─────┘  └────┬─────┘                                                 ║
║       │ publish     │ REST API (port 3001)                                   ║
║       │ alerts      │ WebSocket (port 3001)                                  ║
║       ▼             │                                                        ║
║  fraud-alerts ──────┘                                                        ║
║                     │                                                        ║
║                     ▼                                                        ║
║            ┌─────────────────┐                                               ║
║            │  DASHBOARD UI   │  Browser: http://localhost:5173               ║
║            │  (React + Vite) │  Update real-time via WebSocket               ║
║            └─────────────────┘                                               ║
║                                                                              ║
║  ┌──────────────┐                                                            ║
║  │  KAFKA UI    │  Browser: http://localhost:8080                            ║
║  │(provectus)   │  Inspect topic, messages, consumer groups                  ║
║  └──────────────┘                                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Port yang Digunakan

| Service | Port | Akses |
|---|---|---|
| Kafka (dari host) | 9092 | `localhost:9092` |
| Kafka (antar container) | 9094 | `kafka:9094` (internal Docker) |
| Kafka Controller | 9093 | Internal saja |
| Kafka UI | 8080 | http://localhost:8080 |
| Backend API + WS | 3001 | http://localhost:3001 |
| Dashboard UI | 5173 | http://localhost:5173 |

---

## 4. Alur Data End-to-End

Berikut perjalanan sebuah event klaim **yang terdeteksi fraud** dari lahir sampai muncul di dashboard:

```
Langkah 1: Generator membuat event klaim
──────────────────────────────────────────
  claimGenerator.js memilih secara acak:
  - peserta_id: "BPJS-000003"
  - procedure_code: "PRCS-MATA-01"  (operasi katarak)
  - diagnosis_code: "I10"           (hipertensi) ← TIDAK COCOK!
  - claim_amount: 3.500.000
  → ini adalah anomali tipe "inconsistent_diagnosis"

Langkah 2: Generator publish ke Kafka
──────────────────────────────────────────
  producer.send({
    topic: "claims",
    key: "BPJS-000003",     ← menentukan partition
    value: JSON.stringify(claim)
  })
  → Event masuk ke Partition 0 (misal), offset 1842

Langkah 3: Fraud Detector consume event
──────────────────────────────────────────
  consumer.run({ eachMessage: async ({ topic, message }) => {
    const claim = JSON.parse(message.value)
    → Jalankan 5 aturan secara berurutan:

    ✗ duplicateClaim.check()       → tidak duplikat
    ✗ abnormalAmount.check()       → amount normal
    ✗ highFrequency.check()        → frekuensi aman
    ✓ inconsistentDiagnosis.check() → TERDETEKSI! I10 ≠ PRCS-MATA-01
    ✗ faskesSpike.check()          → tidak ada spike
  }})

Langkah 4: Fraud Detector publish alert
──────────────────────────────────────────
  producer.send({
    topic: "fraud-alerts",
    value: JSON.stringify({
      alert_id: "ALT-1718000123-x7k2q",
      claim_id: "...",
      alerts: [{
        rule_name: "inconsistent_diagnosis",
        severity: "MEDIUM",
        reason: "Prosedur PRCS-MATA-01 tidak sesuai diagnosis I10..."
      }]
    })
  })

Langkah 5: Backend API consume kedua topik
──────────────────────────────────────────
  → Consume "claims": simpan ke statsStore, broadcast via WebSocket
  → Consume "fraud-alerts": update totalFraud, broadcast via WebSocket

Langkah 6: Dashboard menerima update
──────────────────────────────────────────
  WebSocket onmessage = (payload) => {
    if (payload.type === "alert") {
      setAlerts(prev => [payload.data, ...prev])
      // → Alert muncul di panel "Fraud Alerts" dashboard
    }
    if (payload.type === "stats") {
      setStats(payload.data)
      // → Kartu metrik & grafik update
    }
  }
```

---

## 5. Penjelasan Setiap Komponen

### 5.1 Transaction Generator (`/generator`)

**Tugas**: Membuat event klaim dummy terus-menerus dan mengirimnya ke Kafka.

```
generator/src/
├── index.js              ← Entry point: koneksi Kafka + setInterval kirim event
├── claimGenerator.js     ← Logic pembuatan event
└── data/
    ├── faskesData.js         ← 13 faskes dummy (8 FKTP + 5 FKRTL)
    └── diagnosisProcedureMap.js ← 10 diagnosis + prosedur valid + harga median
```

**Cara kerja `claimGenerator.js`**:
```
generateClaim()
  │
  ├── Math.random() < ANOMALY_RATIO (0.12)?
  │     ├── YA  → buildAnomalyClaim()
  │     │           └── pilih jenis anomali: high_amount / duplicate /
  │     │               inconsistent_diagnosis / high_frequency
  │     └── TIDAK → buildNormalClaim()
  │                   └── pilih diagnosis → ambil prosedur valid
  │                       → hitung amount ±40% dari median
  │
  └── simpan ke recentClaims[] (buffer 100 item, untuk referensi duplikat)
```

**Konfigurasi**:
- `EVENTS_PER_SECOND=2` → kirim 1 event tiap 500ms
- `ANOMALY_RATIO=0.12` → 12% event adalah anomali

---

### 5.2 Fraud Detector (`/fraud-detector`)

**Tugas**: Membaca setiap klaim dari topik `claims`, menjalankan 5 aturan fraud, dan menerbitkan alert ke topik `fraud-alerts`.

```
fraud-detector/src/
├── index.js              ← Consumer + pipeline aturan
├── state/
│   └── inMemoryStore.js  ← Windowed state (Map) + cleanup periodik
└── rules/
    ├── duplicateClaim.js
    ├── abnormalAmount.js
    ├── highFrequency.js
    ├── inconsistentDiagnosis.js
    └── faskesSpike.js
```

**Pipeline per event**:
```
Untuk setiap klaim masuk:
  now = Date.now()
  alerts = []

  for (const rule of [dup, amount, freq, diag, spike]) {
    result = rule.check(claim, now)
    if (result) alerts.push(result)
  }

  if (alerts.length > 0) → publish ke fraud-alerts
```

Satu klaim bisa memicu **lebih dari satu aturan** sekaligus.

---

### 5.3 In-Memory State (`inMemoryStore.js`)

State untuk aturan yang butuh **konteks historis** (windowed):

```
┌──────────────────────────────────────────────────────────────────┐
│                     inMemoryStore                                 │
│                                                                   │
│  duplicateWindow: Map                                             │
│  ┌─────────────────────────────────┬────────────────────────┐    │
│  │ "BPJS-001|PRCS-HT-01|2024-01-15"│ [t1, t2, t3]          │    │
│  │ "BPJS-002|PRCS-DM-01|2024-01-15"│ [t1]                  │    │
│  └─────────────────────────────────┴────────────────────────┘    │
│  → timestamps dalam 5 menit terakhir                             │
│                                                                   │
│  frequencyWindow: Map                                             │
│  ┌──────────┬───────────────────────────────────────────────┐    │
│  │ BPJS-001 │ [t1, t2, t3, t4, t5, t6] ← 6 klaim/jam!     │    │
│  │ BPJS-002 │ [t1, t2]                                      │    │
│  └──────────┴───────────────────────────────────────────────┘    │
│  → timestamps dalam 1 jam terakhir                               │
│                                                                   │
│  amountHistory: Map                                               │
│  ┌──────────────┬────────────────────────────────────────────┐   │
│  │ PRCS-MATA-01 │ [3500000, 3200000, 4100000, ...] (500 val)│   │
│  │ PRCS-HT-01   │ [45000, 52000, 41000, ...]               │   │
│  └──────────────┴────────────────────────────────────────────┘   │
│  → rolling window 500 nilai terakhir per prosedur                │
│                                                                   │
│  Cleanup setiap 5 menit: hapus key dengan array kosong           │
└──────────────────────────────────────────────────────────────────┘
```

**Trade-off in-memory vs produksi**:
| Aspek | In-Memory (simulasi) | Redis / RocksDB (produksi) |
|---|---|---|
| Kecepatan | Ultra cepat | Cepat (< 1ms) |
| Persistensi | Hilang saat restart | Tetap ada |
| Distribusi | Hanya 1 instance | Bisa multi-instance |
| Kompleksitas | Sangat sederhana | Perlu setup tambahan |

---

### 5.4 Backend API (`/backend`)

**Tugas**: Jembatan antara Kafka dan Dashboard. Consume 2 topik, simpan ringkasan di memori, dan push update ke browser via WebSocket.

```
backend/src/
├── index.js              ← Express server + WebSocketServer + Kafka consumer
├── consumers/
│   ├── claimsConsumer.js     ← subscribe "claims" + panggil addClaim()
│   └── alertsConsumer.js     ← subscribe "fraud-alerts" + panggil addAlert()
├── state/
│   └── statsStore.js         ← state in-memory: total, recent[], trend[]
└── routes/
    └── stats.js              ← GET /api/stats, /recent-claims, /recent-alerts
```

**Cara kerja WebSocket broadcast**:
```
Kafka consumer menerima event
  │
  ├── addClaim(claim) atau addAlert(alert)  ← update state lokal
  │
  └── broadcast({ type: "claim", data: claim })
        │
        └── wss.clients.forEach(client => client.send(JSON.stringify(payload)))
              ↑
              └── semua browser yang sedang buka dashboard menerima update ini
```

**Endpoint REST**:
```
GET /api/stats
→ { totalClaims, totalFraud, totalRiskAmount, throughput, trend[] }

GET /api/recent-claims
→ [ ...50 klaim terbaru ]

GET /api/recent-alerts
→ [ ...50 fraud alert terbaru ]

GET /health
→ { status: "ok" }
```

---

### 5.5 Dashboard UI (`/frontend`)

**Tugas**: Menampilkan data secara visual dan real-time di browser.

```
frontend/src/
├── App.jsx               ← Root: state management + layout
├── hooks/
│   └── useWebSocket.js       ← custom hook: koneksi + auto-reconnect
└── components/
    ├── MetricCard.jsx        ← Kartu statistik (Total, Fraud, Risk, Throughput)
    ├── ClaimFeed.jsx         ← Live scroll 50 klaim terbaru
    ├── FraudAlertFeed.jsx    ← Live scroll 50 alert terbaru + badge severity
    ├── TrendChart.jsx        ← Area chart Recharts (claims vs fraud per menit)
    └── ConnectionStatus.jsx  ← Dot hijau/merah + auto-reconnect 3 detik
```

**Alur state di React**:
```
useWebSocket(handleMessage)
  ↓ WebSocket message masuk
handleMessage(payload)
  ├── type: "stats"  → setStats(payload.data)   → MetricCard + TrendChart re-render
  ├── type: "claim"  → setClaims(prev => [data, ...prev].slice(0, 50))  → ClaimFeed
  └── type: "alert"  → setAlerts(prev => [data, ...prev].slice(0, 50)) → FraudAlertFeed
```

---

## 6. Model Data: Struktur Event Klaim

### Event Klaim (`topic: claims`)

```json
{
  "claim_id":       "a3f2b1c0-4e5d-...",   // UUID unik per klaim
  "peserta_id":     "BPJS-000042",          // ID peserta JKN
  "faskes_id":      "FKRTL-001",            // ID fasilitas kesehatan
  "faskes_type":    "FKRTL",                // FKTP (puskesmas/klinik) atau FKRTL (RS)
  "faskes_name":    "RSUD Dr. Cipto ...",   // Nama lengkap faskes
  "diagnosis_code": "H26",                  // Kode ICD-10 (katarak)
  "procedure_code": "PRCS-MATA-01",         // Kode prosedur tindakan
  "claim_amount":   3500000,                // Nilai klaim dalam Rupiah
  "service_date":   "2024-01-15",           // Tanggal pelayanan
  "submitted_at":   "2024-01-15T08:23:11Z", // Waktu pengajuan klaim
  "region":         "DKI Jakarta",          // Provinsi/kota
  "is_anomaly":     false,                  // Internal: apakah ini event anomali?
  "anomaly_type":   null                    // Internal: jenis anomali
}
```

### Event Fraud Alert (`topic: fraud-alerts`)

```json
{
  "alert_id":       "ALT-1718000123-x7k2q",  // ID alert unik
  "claim_id":       "a3f2b1c0-...",           // Klaim yang dipicu
  "peserta_id":     "BPJS-000042",
  "faskes_id":      "FKRTL-001",
  "faskes_name":    "RSUD Dr. Cipto ...",
  "diagnosis_code": "I10",
  "procedure_code": "PRCS-MATA-01",
  "claim_amount":   3500000,
  "region":         "DKI Jakarta",
  "detected_at":    "2024-01-15T08:23:11Z",
  "alerts": [
    {
      "rule_name": "inconsistent_diagnosis",  // Nama aturan yang terpicu
      "severity":  "MEDIUM",                  // HIGH / MEDIUM / LOW
      "reason":    "Prosedur PRCS-MATA-01 tidak sesuai dengan diagnosis I10..."
    }
  ]
}
```

### Mapping Diagnosis → Prosedur Valid

| Kode ICD-10 | Diagnosis | Prosedur Valid |
|---|---|---|
| `I10` | Hipertensi | PRCS-HT-01, PRCS-HT-02, PRCS-LAB-BP |
| `E11` | Diabetes Melitus Tipe 2 | PRCS-DM-01, PRCS-DM-02, PRCS-LAB-GD, PRCS-LAB-HBA1C |
| `J06` | ISPA | PRCS-ISPA-01, PRCS-ISPA-02 |
| `A15` | Tuberkulosis Paru | PRCS-TB-01, PRCS-TB-02, PRCS-RAD-XRAY |
| `A91` | Demam Berdarah | PRCS-DBD-01, PRCS-LAB-NS1, PRCS-LAB-DPL |
| `S52` | Fraktur Lengan | PRCS-FRAK-01, PRCS-RAD-XRAY, PRCS-ORTHO-01 |
| `H26` | Katarak | PRCS-MATA-01, PRCS-MATA-02 |
| `K37` | Appendicitis | PRCS-APD-01, PRCS-APD-02, PRCS-LAB-DPL |
| `Z37` | Persalinan Normal | PRCS-OBS-01, PRCS-OBS-02 |

---

## 7. Cara Kerja Setiap Aturan Deteksi Fraud

### Aturan 1: `duplicate_claim`
**File**: `fraud-detector/src/rules/duplicateClaim.js`

**Logika**: Peserta yang sama mengajukan prosedur yang sama pada tanggal yang sama lebih dari sekali dalam 5 menit.

```
Klaim masuk: peserta=BPJS-001, prosedur=PRCS-HT-01, tanggal=2024-01-15

State duplicateWindow:
  key = "BPJS-001|PRCS-HT-01|2024-01-15"
  timestamps = [T-300s, T-120s, T-0s]   ← 3 kali dalam 5 menit!
                                                          ↑ klaim ke-3 ini

count = 3 ≥ 2 → ALERT!
severity: HIGH
reason: "Peserta BPJS-001 mengajukan prosedur PRCS-HT-01 pada 2024-01-15
         sebanyak 3× dalam 5 menit terakhir"
```

**Skenario nyata**: Faskes mengirim klaim yang sama berulang karena bug sistem, atau upaya klaim ganda.

---

### Aturan 2: `abnormal_amount`
**File**: `fraud-detector/src/rules/abnormalAmount.js`

**Logika**: Nilai klaim > 3× median historis untuk prosedur tersebut.

```
Histori PRCS-MATA-01 (operasi katarak):
  [3.500.000, 3.200.000, 4.100.000, 3.800.000, ... 50 nilai]
  median = 3.650.000

Klaim baru: claim_amount = 15.000.000
  15.000.000 > 3 × 3.650.000 (10.950.000) → ALERT!

severity: MEDIUM
reason: "Nilai klaim Rp15.000.000 = 4.1× median (Rp3.650.000)
         untuk prosedur PRCS-MATA-01"
```

**Catatan penting**: Aturan ini baru aktif setelah **10 sampel** terkumpul untuk prosedur tersebut, agar median stabil dan tidak false positive di awal.

**Skenario nyata**: Faskes menggelembungkan nilai klaim (markup fraud).

---

### Aturan 3: `high_frequency`
**File**: `fraud-detector/src/rules/highFrequency.js`

**Logika**: Satu peserta mengajukan > 5 klaim dalam 1 jam.

```
State frequencyWindow["BPJS-000001"]:
  timestamps = [T-55min, T-40min, T-30min, T-20min, T-10min, T-5min]
                                                               ↑ klaim ke-6!
  count = 6 > 5 → ALERT!

severity: HIGH
reason: "Peserta BPJS-000001 mengajukan 6 klaim dalam 1 jam terakhir (batas: 5)"
```

**Cara generator membuat anomali ini**: Memilih dari pool 5 "peserta hot" (`BPJS-000001` s/d `BPJS-000005`) sehingga mereka mendapat klaim jauh lebih banyak dari peserta lain.

**Skenario nyata**: Peserta "dititipkan" di banyak faskes sekaligus, atau data peserta dicuri dan digunakan massal.

---

### Aturan 4: `inconsistent_diagnosis`
**File**: `fraud-detector/src/rules/inconsistentDiagnosis.js`

**Logika**: Prosedur yang ditagihkan tidak ada dalam daftar prosedur valid untuk diagnosis tersebut.

```
Mapping valid:
  I10 (Hipertensi) → [PRCS-HT-01, PRCS-HT-02, PRCS-LAB-BP]

Klaim:
  diagnosis_code = "I10"
  procedure_code = "PRCS-MATA-01"   ← operasi katarak untuk pasien hipertensi?

  "PRCS-MATA-01" NOT IN [PRCS-HT-01, PRCS-HT-02, PRCS-LAB-BP] → ALERT!

severity: MEDIUM
reason: "Prosedur PRCS-MATA-01 tidak sesuai dengan diagnosis I10.
         Prosedur valid: PRCS-HT-01, PRCS-HT-02, PRCS-LAB-BP"
```

**Skenario nyata**: Faskes menagih prosedur mahal (operasi) untuk pasien yang sebenarnya hanya konsultasi ringan, dengan menuliskan diagnosis yang tidak sesuai.

---

### Aturan 5: `faskes_spike`
**File**: `fraud-detector/src/rules/faskesSpike.js`

**Logika**: Volume klaim dari satu faskes dalam 10 menit melonjak > 3× rata-rata baselinenya.

```
Baseline FKTP-003 (dari EMA — Exponential Moving Average):
  Volume rata-rata per 10 menit = 4 klaim

Tiba-tiba:
  faskesWindow["FKTP-003"] dalam 10 menit terakhir = 15 klaim
  15 > 3 × 4 (12) → ALERT!

severity: HIGH
reason: "Faskes FKTP-003 (Puskesmas Lowokwaru) mengirim 15 klaim dalam
         10 menit — 3.8× baseline (4.0)"
```

**Cara baseline dihitung** (EMA = Exponential Moving Average):
```
ema_baru = ema_lama × 0.9 + count_sekarang × 0.1
→ Baseline bergerak lambat, spike tiba-tiba langsung terdeteksi
→ Butuh baseline ≥ 5 klaim/10menit sebelum aktif (hindari false positive awal)
```

**Skenario nyata**: Faskes "ghost" atau faskes yang tiba-tiba mengajukan ribuan klaim dalam waktu singkat — pola umum fraud fasilitas.

---

## 8. Cara Kerja Dashboard Real-Time

### Koneksi WebSocket

```
Browser                              Backend (ws://localhost:3001)
   │                                          │
   │──── WebSocket handshake ───────────────► │
   │◄─── connection established ─────────────│
   │                                          │
   │         (setiap detik)                   │
   │◄─── { type: "stats", data: {...} } ──────│ ← statsStore kirim update
   │                                          │
   │         (setiap ada klaim)               │
   │◄─── { type: "claim", data: {...} } ──────│ ← dari Kafka topic claims
   │                                          │
   │         (setiap ada fraud)               │
   │◄─── { type: "alert", data: {...} } ──────│ ← dari Kafka topic fraud-alerts
   │                                          │
   │   (jika koneksi putus)                   │
   │──── reconnect setelah 3 detik ─────────► │
```

### Tipe Pesan WebSocket

| `type` | Dikirim kapan | Komponen yang update |
|---|---|---|
| `stats` | Setiap 1 detik (interval) | MetricCard, TrendChart |
| `claim` | Setiap ada klaim baru dari Kafka | ClaimFeed |
| `alert` | Setiap ada fraud alert dari Kafka | FraudAlertFeed, MetricCard |

### Grafik Tren (TrendChart)

```
State trend[] di statsStore:
  [
    { minute: "08:20", claims: 12, fraud: 2 },
    { minute: "08:21", claims: 15, fraud: 1 },
    { minute: "08:22", claims: 11, fraud: 3 },  ← menit saat ini
  ]

→ Diperbarui setiap ada klaim/alert baru
→ Disimpan 30 menit terakhir
→ Dikirim ke browser dalam payload "stats" tiap 1 detik
```

---

## 9. Perbandingan: EDA vs Sistem Tradisional

### Sistem Tradisional (Batch/Polling)

```
Faskes kirim klaim
  → Simpan ke database
  → Setiap malam jam 00:00: jalankan batch fraud check
  → Besok pagi: laporan fraud tersedia

Masalah:
  ✗ Fraud baru ketahuan setelah 24 jam
  ✗ Klaim sudah dibayar sebelum terdeteksi
  ✗ Tidak bisa react real-time
```

### Sistem EDA (Streaming)

```
Faskes kirim klaim
  → Event masuk Kafka dalam < 100ms
  → Fraud Detector proses dalam < 10ms
  → Alert muncul di dashboard dalam < 1 detik

Keunggulan:
  ✓ Fraud terdeteksi sebelum klaim diproses
  ✓ Alert langsung ke tim investigasi
  ✓ Bisa blokir klaim otomatis
  ✓ Semua event tersimpan untuk audit
```

### Angka Performa Simulasi Ini

Dengan konfigurasi default (`EVENTS_PER_SECOND=2`):

| Metrik | Nilai |
|---|---|
| Throughput | 2 event/detik |
| Latensi generator → Kafka | < 50ms |
| Latensi Kafka → Fraud Detector | < 100ms |
| Latensi alert → Dashboard | < 200ms |
| Total end-to-end | **< 500ms** |

Untuk meningkatkan throughput, ubah `.env`:
```
EVENTS_PER_SECOND=10   → 10 event/detik
EVENTS_PER_SECOND=50   → 50 event/detik (butuh CPU lebih)
```

---

*Dokumen ini menjelaskan arsitektur simulasi untuk tujuan pembelajaran. Implementasi produksi memerlukan: autentikasi Kafka (SASL/SSL), persistent state (Redis), monitoring (Prometheus/Grafana), dan deployment di Kubernetes.*
