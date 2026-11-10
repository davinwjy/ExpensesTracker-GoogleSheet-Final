# Implementation Plan: Google Sheets Sync Performance Optimization & Row Safety Clarification

## 1. Reassurance: Menghapus Baris Kosong 100% Aman
> [!NOTE]
> **Jawaban untuk pertanyaan Anda**: Menghapus baris kosong di Google Sheet **SAMA SEKALI TIDAK MENGANGGU** penambahan atau pengambilan data transaksi baru!

- **Mengapa Aman?**: Saat Anda menambah transaksi baru dari aplikasi, Google Apps Script menggunakan perintah `sheet.appendRow(...)`. Perintah ini bekerja secara dinamis: ia akan langsung menambahkan baris baru tepat di bawah transaksi terakhir.
- **Manfaat**: Dengan menghapus ribuan baris kosong yang tidak terpakai, Google Apps Script tidak perlu lagi membaca atau memindai ribuan sel kosong, sehingga proses baca/tulis data transaksi menjadi **jauh lebih cepat dan hemat memori peladen**.

---

## 2. Technical Code Optimization: Google Apps Script (`Code.gs`)

Untuk memaksimalkan kecepatan sinkronisasi hingga **5x lebih cepat**, kami akan mengoptimalkan kode template Google Apps Script di dalam aplikasi:

### A. Mengganti `getDisplayValues()` dengan `getValues()`
- `getDisplayValues()` memaksa peladen Google memformat teks (misal: mata uang/format tanggal) satu per satu, yang memakan waktu cukup lama.
- `getValues()` membaca data mentah (*raw data*) langsung dari memori peladen secara *instant*.

### B. Single-Batch Scanning
- Membaca data seluruh tab dalam satu panggilan API tunggal `sheet.getDataRange().getValues()` dan menyaring baris kosong secara otomatis di dalam memori.

---

## Proposed Changes to Codebase

### `src/lib/appsScriptService.ts`
- Perbarui `APPS_SCRIPT_TEMPLATE_CODE` menggunakan teknik `getDataRange().getValues()` yang dioptimasi.
- Perbarui pembacaan tanggal dan angka agar mendukung format data mentah (*raw values*) dari Google Sheets secara presisi.

---

## Verification Plan

### Automated Verification
- Run `compile_applet` to verify zero TypeScript build errors.
- Run `lint_applet` to verify zero ESLint errors.

### Manual Verification
1. Terapkan kode Apps Script terbaru ke `Code.gs` di Google Sheet Anda.
2. Jalankan *pull-to-refresh* di aplikasi untuk menguji kecepatan sinkronisasi data transaksi yang baru.
