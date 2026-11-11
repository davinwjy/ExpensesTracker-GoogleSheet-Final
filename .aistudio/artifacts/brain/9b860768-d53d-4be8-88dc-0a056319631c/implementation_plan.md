# Kategori Default "Debt Repayment" pada Income

Menambahkan kategori bawaan (**Default Category**) bernama **`Debt Repayment`** pada daftar kategori **Income** untuk mencatat uang masuk dari teman yang membayar utang/piutang, serta menghitungnya sebagai pemasukan biasa yang langsung menambah saldo akun tujuan.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berikut adalah keputusan yang telah dikonfirmasi dari jawaban Anda sebelum implementasi dijalankan:

- **Confirmed Decision 1 (Kategori Pencatatan)**: Menambahkan kategori default **`Debt Repayment`** ke dalam daftar kategori **Income** bawaan (bersanding dengan *Reimbursement*, *Salary / Wage*, dll.).
- **Confirmed Decision 2 (Perhitungan Laporan & Saldo)**: Transaksi **`Debt Repayment`** pada akun kas/bank dihitung sebagai **Income biasa** pada laporan bulanan/tahunan dan langsung menambah saldo akun yang dipilih.

---

## 1. Overview & Core Concept

- **What It Does**: Menyediakan kategori resmi **`Debt Repayment`** di dalam pilihan **Income** ketika pengguna mencatat transaksi uang masuk dari teman yang melunasi pinjaman atau mengganti utang.
- **Target Audience / Persona**: Pengguna yang sering menalangi atau meminjamkan dana kepada teman (yang sebelumnya dicatat pada kategori *Debt & Loans* di Expense) dan ingin mencatat pelunasannya secara terstruktur tanpa bercampur dengan *Reimbursement* kantor.
- **Key Value**: Memisahkan pengembalian piutang personal (*Debt Repayment*) dari klaim *Reimbursement* biasa, dengan warna penanda khusus agar mudah difilter di halaman **Transactions** dan dianalisis pada grafik arus kas.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. Pengguna membuka modal **Record Transaction** (`INCOME +`) atau menekan tombol **Add Income** di halaman **Transactions**.
  2. Pengguna memilih akun penerima (Bank / Cash), memasukkan nominal pelunasan utang dari teman, lalu memilih kategori **`Debt Repayment`** pada dropdown **Classification / Category**.
  3. Setelah disimpan, saldo akun Bank/Cash bertambah sesuai nominal, transaksi tampil di daftar **Transactions** dengan warna penanda khusus, dan nilainya masuk ke perhitungan **Total Income**.
  4. Di menu **Transaction Categories**, kategori **`Debt Repayment`** juga tampil sebagai kategori `INCOME` berstatus `DEFAULT`.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Utilitarian financial ledger dengan tipografi tabular (`font-mono tabular-nums`) yang konsisten dengan tema aplikasi saat ini.
  - *Color Palette & Mood*: Menggunakan aksen warna **Indigo (`#6366f1`)** untuk kategori **`Debt Repayment`** agar kontras dan mudah dibedakan dari *Reimbursement* (`#06b6d4` cyan) maupun *Salary / Wage* (`#10b981` emerald).
  - *Typography & Hierarchy*: Label kategori satu baris yang ringkas dan jelas pada dropdown maupun tabel transaksi.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Menjadikan `Debt Repayment` sebagai Kategori Default di `INCOME_CATEGORIES`**
  - *Chosen Approach*: Menambahkan `'Debt Repayment'` langsung ke konstanta `INCOME_CATEGORIES` dan memetakan warnanya pada `CATEGORY_COLORS`.
  - *Why*: Tersedia secara otomatis untuk seluruh sesi dan perangkat tanpa perlu dibuat manual melalui *Custom Category*, serta langsung terintegrasi dengan filter transaksi dan sinkronisasi Google Sheets.
  - *Alternatives Considered*: Meminta pengguna membuat kategori manual — kurang praktis karena pelunasan utang adalah pasangan alami dari kategori bawaan *Debt & Loans* pada Expense.
- **Decision 2: Perlakuan Arus Kas sebagai Income Standar**
  - *Chosen Approach*: Transaksi `income` dengan kategori `Debt Repayment` ke rekening Bank/Cash diperlakukan sama seperti kategori Income standar lainnya (menambah saldo akun dan dihitung dalam *Total Income*).
  - *Why*: Sesuai dengan preferensi Anda agar uang kas yang kembali tercatat penuh sebagai pemasukan dan menambah saldo akun.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌──────────────────────────────────────────────────────────────┐
│                 Default Category Registry                    │
│  INCOME_CATEGORIES + CATEGORY_COLORS ('Debt Repayment')      │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
                ▼                              ▼
┌───────────────────────────────┐  ┌───────────────────────────┐
│      FinanceContext State     │  │   Transaction Analytics   │
│  incomeCategories (Default +  │  │  Counts as standard       │
│  Custom merged automatically) │  │  Income & adds to balance │
└───────┬───────────────┬───────┘  └───────────────────────────┘
        │               │
        ▼               ▼
┌───────────────┐ ┌────────────────────────────────────────────┐
│ AddExpense    │ │ ExpensesView Filter & CategoryModal List   │
│ Modal (Income │ │ Shows 'Debt Repayment' with Indigo accent  │
│ Dropdown)     │ │ and DEFAULT badge                          │
└───────────────┘ └────────────────────────────────────────────┘
```

- **Data Model & State**:
  - Menambahkan `'Debt Repayment'` ke daftar `INCOME_CATEGORIES` (tepat setelah `'Reimbursement'`) beserta warna `#6366f1` pada `CATEGORY_COLORS`.
  - `FinanceContext` secara otomatis menggabungkan `INCOME_CATEGORIES` dengan kategori kustom ke dalam `incomeCategories`, sehingga `AddExpenseModal`, `ExpensesView`, dan `CategoryModal` langsung menampilkan opsi **`Debt Repayment`**.
- **Interactive Component & State Mapping**:
  - Saat pengguna memilih tab `INCOME +` di form transaksi, dropdown kategori menampilkan **`Debt Repayment`**.
  - Saat pengguna memfilter kategori di halaman **Transactions** dengan mode *All Types* atau *Income Only*, **`Debt Repayment`** muncul sebagai opsi filter yang valid.
