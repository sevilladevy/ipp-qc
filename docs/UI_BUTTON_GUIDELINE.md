# UI Button Guideline

## Tujuan

Menjaga konsistensi gaya tombol antar halaman supaya tidak drift.

## Kelas yang dipakai

- `btn-primary`: aksi utama (submit, save, confirm).
- `btn-secondary`: aksi pendamping (reset, refresh, cancel ringan).

## Aturan penggunaan

1. Gunakan `btn-primary` dan `btn-secondary` sebagai default lintas halaman.
2. Jangan override struktur global di level halaman:
   - `padding`
   - `border-radius`
   - `font-size`
   - `min-height`
   - `display/alignment`
3. Untuk kebutuhan visual khusus konteks, override hanya via CSS variables:
   - `--btn-primary-bg`
   - `--btn-primary-bg-hover`
   - `--btn-primary-border`
   - `--btn-primary-fg`
   - `--btn-primary-shadow`
   - `--btn-secondary-bg`
   - `--btn-secondary-bg-hover`
   - `--btn-secondary-border`
   - `--btn-secondary-fg`

## Contoh

```tsx
<button className="btn-primary">Save</button>
<button className="btn-secondary">Reset</button>
```

```css
.my-page {
  --btn-primary-bg: #1d4ed8;
  --btn-primary-bg-hover: #1e40af;
}
```

## Referensi implementasi

- Global style: `src/styles.css` (`.btn-primary`, `.btn-secondary`)
- Page overrides (jika perlu): `src/pages-theme.css`

## Guard agar tidak drift lagi

- Jalankan `npm run lint:ui:buttons` untuk cek otomatis agar override tombol di level halaman tidak melebar.
- Override level halaman yang diizinkan hanya untuk layout:
  - `flex`
  - `width`
  - `justify-content`
