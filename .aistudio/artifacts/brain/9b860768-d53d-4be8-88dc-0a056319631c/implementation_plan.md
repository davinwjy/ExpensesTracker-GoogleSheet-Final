# Refund Kartu Kredit & PayLater via Menu Add Income

Rencana ini mengimplementasikan **Metode 1 (Add Income ke Kartu Kredit / PayLater)** untuk mencatat refund tagihan, dengan aturan ketat bahwa pada mode **INCOME (+)**, pilihan akun **Kartu Kredit** atau **PayLater** yang limitnya **tidak terpakai** (`Used Balance = Rp 0`) otomatis disembunyikan dari daftar akun.

## User Review & Critical Decisions

> [!IMPORTANT]
> Seluruh spesifikasi telah disesuaikan dengan permintaan Anda. Silakan klik **Proceed** untuk menerapkan perubahan ini ke dalam aplikasi.

- **Confirmed Decision 1 — Metode 1 (Add Income untuk Refund Kartu Kredit)**: Pencatatan refund kartu kredit dilakukan melalui menu **Add Income (+)** ke akun Kartu Kredit yang bersangkutan, sehingga riwayat transaksi awal (`Rp 35.520`) tetap utuh dan refund tercatat sebagai transaksi pengurang tagihan tersendiri.
- **Confirmed Decision 2 — Sembunyikan Kartu Kredit / PayLater yang Limitnya Tidak Terpakai**: Saat berada di tab **INCOME (+)**, dropdown pilihan akun hanya menampilkan rekening **Bank / Cash / E-Wallet** serta akun **Credit Card / PayLater yang memiliki tagihan berjalan (`balance > 0`)**. Kartu Kredit atau PayLater yang limitnya utuh / tidak terpakai (`balance <= 0`) tidak akan ditampilkan.
- **Confirmed Decision 3 — Validasi Batas Refund & Akuntansi Bersih**:
  - Jika pengguna memilih Kartu Kredit/PayLater yang sedang terpakai pada mode **INCOME (+)**, kategori otomatis diarahkan ke **Cashback & Refunds**.
  - Nominal refund yang dimasukkan pada Kartu Kredit/PayLater dibatasi agar tidak melebihi jumlah limit yang sedang terpakai (*Used Debt*).
  - Transaksi *Income* pada Kartu Kredit/PayLater otomatis mengurangi saldo tagihan kartu kredit tanpa menggelembungkan statistik *Monthly Cash Income* (pemasukan kas bulanan) di Dashboard.

---

## 1. Overview & Core Concept

- **What It Does**: Memungkinkan pengguna mencatat *refund* atau *cashback* langsung ke akun Kartu Kredit / PayLater yang sedang memiliki tagihan terpakai melalui menu **Add Income (+)**, sembari menyembunyikan kartu kredit/PayLater yang tidak memiliki tagihan (`Used = 0`) agar daftar akun tetap bersih dan bebas dari salah pilih.
- **Target Audience / Persona**: Pengguna yang menerima *partial refund* atau *full refund* atas transaksi kartu kredit/PayLater dan ingin memulihkan limit kartu kredit secara akurat.
- **Key Value**: Mencegah kesalahan input (tidak bisa memasukkan *income*/refund ke kartu kredit yang tidak punya tagihan), mengotomatiskan pemilihan kategori *Cashback & Refunds*, dan menjaga akurasi *Net Worth* serta sisa limit kredit.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. Pengguna membuka modal **Record Cash Outflow / Inflow**, lalu beralih ke tab **INCOME (+)**.
  2. Sistem secara dinamis menyaring dropdown **DESTINATION LEDGER (CREDIT)**:
     - Seluruh akun **Bank**, **Cash**, dan **E-Wallet** tampil seperti biasa.
     - Akun **Credit Card** dan **PayLater** **hanya tampil jika limitnya sedang terpakai (`balance > 0`)**. Jika kartu kredit tidak memiliki pemakaian (`balance === 0`), kartu tersebut otomatis disembunyikan.
     - Jika akun yang sebelumnya terpilih kebetulan adalah kartu kredit dengan pemakaian `0` saat beralih dari tab *Expense* ke *Income*, pilihan akun otomatis berpindah ke akun pertama yang valid.
  3. Saat pengguna memilih akun Kartu Kredit / PayLater yang limitnya sedang terpakai pada mode **INCOME (+)**:
     - Kategori otomatis disetel ke **Cashback & Refunds**.
     - Label informasi di kanan atas dropdown menampilkan **USED LIMIT (DEBT): Rp [Tagihan Terpakai]** agar pengguna tahu batas maksimal refund yang dapat dimasukkan.
     - Jika pengguna memasukkan angka refund melebihi tagihan terpakai pada kartu tersebut, muncul peringatan validasi bahwa nominal refund melebihi limit yang sedang terpakai.
  4. Pengguna menekan **SAVE INCOME**, dan tagihan kartu kredit langsung berkurang serta limit tersedia (*Available Limit*) kembali bertambah.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Utilitarian Financial Ledger dengan tipografi `Plus Jakarta Sans` dan angka tabular `JetBrains Mono` (`tabular-nums`).
  - *Color Palette & Mood*: Aksen *emerald* untuk mode `INCOME (+)` dan pemulihan limit kredit, serta *rose* untuk peringatan batas nominal refund.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Penyaringan Dinamis Akun Kartu Kredit / PayLater pada Mode Income**
  - *Chosen Approach*: Menyaring daftar akun (`selectableAccounts`) ketika `type === 'income'` dengan kondisi `acc.type !== 'credit_card' && acc.type !== 'paylater' || acc.balance > 0` (dengan pengecualian tetap menampilkan akun tersebut jika pengguna sedang mengedit transaksi *income* lama pada kartu itu).
  - *Why*: Kartu kredit dan PayLater bukan rekening tabungan penyimpan uang tunai; dana masuk ke kartu kredit hanya relevan jika ada limit terpakai (tagihan) yang sedang di-refund atau dikurangi.
- **Decision 2: Pemisahan Refund Kartu Kredit dari Pemasukan Kas Bulanan**
  - *Chosen Approach*: Memperbarui `statsHelper.ts` dan `AnalyticsView.tsx` agar transaksi `type === 'income'` pada akun `credit_card` / `paylater` tidak dihitung sebagai pemasukan uang tunai bulanan (*Monthly Cash Inflow*), melainkan khusus memotong saldo utang kartu kredit.
  - *Why*: Menjaga laporan arus kas (*Cash Flow*) bulanan tetap murni mencerminkan uang masuk ke rekening Bank/Cash/E-Wallet.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌──────────────────────────────────────────────────────────────────────┐
│                   Add / Edit Transaction Modal                       │
│                        (Mode: INCOME +)                              │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│               Filter Daftar Akun (selectableAccounts)                │
│  • Bank / Cash / E-Wallet ──────────────────────► TAMPIL             │
│  • Credit Card / PayLater (Used Balance > 0) ───► TAMPIL (Refund)    │
│  • Credit Card / PayLater (Used Balance == 0) ──► DISEMBUNYIKAN      │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Saat Akun CC (Used > 0) Dipilih
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│            Auto-Kategori & Validasi Refund Kartu Kredit              │
│  • Kategori otomatis: "Cashback & Refunds"                           │
│  • Validasi: Nominal Refund <= Used Balance (Tagihan Terpakai)       │
│  • Simpan: Kurangi Used Balance CC & Pulihkan Available Credit Limit │
└──────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `selectableAccounts`: Daftar akun terfilter di `AddExpenseModal` berdasarkan `type` (`expense` menampilkan semua akun; `income` menyembunyikan `credit_card` & `paylater` yang `balance <= 0`).
  - `maxRefundableDebt`: Untuk `type === 'income'` pada akun `credit_card` / `paylater`, menghitung batas maksimal refund sebesar `selectedAccount.balance` (ditambah `editingTransaction.amount` jika sedang mengedit transaksi refund yang sudah ada).
- **Interactive Component & State Mapping**:
  - Saat pengguna menekan tombol toggle `INCOME (+)`, `handleTypeChange('income')` memeriksa apakah akun yang sedang terpilih masih ada di `selectableAccounts`; jika tidak (karena kartu kredit tersebut `balance <= 0`), otomatis memilih akun pertama di `selectableAccounts`.
  - Saat pengguna memilih akun `credit_card` atau `paylater` pada mode `INCOME (+)`, kategori otomatis berubah ke `Cashback & Refunds`.
  - Saat form disubmit, `addTransaction` / `updateTransaction` mengurangi `balance` (tagihan terpakai) pada kartu kredit dan menyinkronkan ke Firestore, Local Storage, dan Google Sheet.
