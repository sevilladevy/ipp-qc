# CSV Validation Report

- Production: `C:\Users\Dell\Documents\DATA DAILY PRODUKSI.csv`
- Master: `C:\Users\Dell\Documents\Master Data.csv`
- Production rows: 1340
- Master rows: 146
- Errors: 46
- Warnings: 46

## Issue Counts

- MASTER_EXTRA_COLUMNS: 42
- PROD_TOTAL_MISMATCH: 15
- PROD_CATEGORY_ERROR: 14
- PROD_MISSING_IN_MASTER: 11
- MASTER_DUPLICATE_ID: 4
- PROD_BLANK_PART: 3
- PROD_DIV_ZERO: 3

## Exact Rows To Fix

### MASTER_EXTRA_COLUMNS

| Line | Date | Part                               | Machine | Detail                                   |
| ---- | ---- | ---------------------------------- | ------- | ---------------------------------------- |
| 2    |      | 7142-6294-51                       |         | Kolom tambahan terisi: 18                |
| 3    |      | 7171-6334-30                       |         | Kolom tambahan terisi: 14                |
| 12   |      | ARM LOCK                           |         | Kolom tambahan terisi: 13                |
| 14   |      | BASE D74A 105B                     |         | Kolom tambahan terisi: 8                 |
| 15   |      | BASE STAY INNER MIRROR 700P        |         | Kolom tambahan terisi: 11                |
| 39   |      | CLIP PIPING KTMN                   |         | Kolom tambahan terisi: 8                 |
| 40   |      | COLLAR KICK KRM                    |         | Kolom tambahan terisi: 9                 |
| 42   |      | COVER A/C K60R#1                   |         | Kolom tambahan terisi: 16                |
| 47   |      | COVER K6OR #1                      |         | Kolom tambahan terisi: 17                |
| 48   |      | COVER LANE CAMERA                  |         | Kolom tambahan terisi: 4                 |
| 49   |      | COVER LANE CAMERA BIG/SMALL        |         | Kolom tambahan terisi: 17, 5             |
| 50   |      | COVER SPARE SWITCH HOLE            |         | Kolom tambahan terisi: 1                 |
| 54   |      | CST 18                             |         | Kolom tambahan terisi: 12, 9, 21, 3, 2   |
| 55   |      | CST 19                             |         | Kolom tambahan terisi: 9, 8              |
| 59   |      | CUP HOLDER CONSOLE BOX             |         | Kolom tambahan terisi: 2                 |
| 60   |      | CUP HOLDER COVER                   |         | Kolom tambahan terisi: 2                 |
| 62   |      | CUSHION                            |         | Kolom tambahan terisi: 21                |
| 63   |      | DECORATION FIN INSIDE HANDLE RH-LH |         | Kolom tambahan terisi: 5                 |
| 65   |      | DECORATION FIN ISIDE HANDLE RH/LH  |         | Kolom tambahan terisi: 17, 18            |
| 66   |      | DUCT KWN                           |         | Kolom tambahan terisi: 3                 |
| 70   |      | ELEMENT K15A                       |         | Kolom tambahan terisi: 12, 11            |
| 71   |      | ELEMENT K18A                       |         | Kolom tambahan terisi: 8, 12, 13, 11, 20 |
| 73   |      | ELEMENT K41K                       |         | Kolom tambahan terisi: 20, 14            |
| 74   |      | ELEMENT K60R                       |         | Kolom tambahan terisi: 20                |
| 78   |      | ELEMENT KOJA #8                    |         | Kolom tambahan terisi: 20                |
| 79   |      | ELEMENT KYZA                       |         | Kolom tambahan terisi: 4                 |
| 81   |      | ELEMENT MIO 125                    |         | Kolom tambahan terisi: 20                |
| 93   |      | FIN INSIDE HANDLE RH/LH            |         | Kolom tambahan terisi: 18, 17            |
| 96   |      | GAUGE OIL KYEA                     |         | Kolom tambahan terisi: 14, 12, 8         |
| 97   |      | GAUGE OIL KYZA                     |         | Kolom tambahan terisi: 8                 |
| 100  |      | GRIP EW010                         |         | Kolom tambahan terisi: 17, 5             |
| 107  |      | HOLDER MIRROR K97G LH              |         | Kolom tambahan terisi: 15                |
| 108  |      | HOLDER MIRROR K97G RH              |         | Kolom tambahan terisi: 15                |
| 110  |      | HOUSING XE 351                     |         | Kolom tambahan terisi: 12                |
| 112  |      | INNER CASE BPN                     |         | Kolom tambahan terisi: 20                |
| 120  |      | LENS K1Z                           |         | Kolom tambahan terisi: 11                |
| 126  |      | LOWER CASE BPN                     |         | Kolom tambahan terisi: 3                 |
| 128  |      | LOWER COVER CONSOLE BOX            |         | Kolom tambahan terisi: 19, 4, 5          |
| 131  |      | NUT BRA #1                         |         | Kolom tambahan terisi: 12                |
| 132  |      | NUT BRA #2                         |         | Kolom tambahan terisi: 12                |
| 134  |      | RUBBER SEAT                        |         | Kolom tambahan terisi: 13, 11            |
| 141  |      | SWITCH LEVER D55L                  |         | Kolom tambahan terisi: 2, 1              |

### MASTER_DUPLICATE_ID

| Line | Date | Part        | Machine | Detail                                                   |
| ---- | ---- | ----------- | ------- | -------------------------------------------------------- |
| 30   |      | CASE CCU #3 | 12      | ID master duplikat setelah trim/normalisasi: CASE CCU #3 |
| 31   |      | CASE CCU #3 | 12      | ID master duplikat setelah trim/normalisasi: CASE CCU #3 |
| 57   |      | CUP HOLDER  | 3       | ID master duplikat setelah trim/normalisasi: CUP HOLDER  |
| 58   |      | CUP HOLDER  | 2       | ID master duplikat setelah trim/normalisasi: CUP HOLDER  |

### PROD_TOTAL_MISMATCH

| Line | Date           | Part                    | Machine | Detail                       |
| ---- | -------------- | ----------------------- | ------- | ---------------------------- |
| 109  | 9 January 2026 | KNOB SUB ASSY C1        | 1       | Output=1369, OK=11740, NG=19 |
| 110  | 9 January 2026 | DUCT KWN                | 2       | Output=2234, OK=3840, NG=45  |
| 112  | 9 January 2026 | CASE XC 603             | 4       | Output=1240, OK=1445, NG=87  |
| 113  | 9 January 2026 | BRACKET D55L            | 7       | Output=463, OK=820, NG=26    |
| 114  | 9 January 2026 | IMPELLER ASSY           | 7       | Output=739, OK=220, NG=24    |
| 117  | 9 January 2026 | CASE CCU #2             | 10      | Output=9459, OK=4545, NG=71  |
| 118  | 9 January 2026 | GAUGE OIL KYEA          | 11      | Output=1010, OK=8770, NG=10  |
| 119  | 9 January 2026 | GAUGE OIL KYZA          | 11      | Output=3472, OK=90, NG=16    |
| 121  | 9 January 2026 | INSERT KNOB C1          | 12      | Output=2779, OK=8112, NG=139 |
| 123  | 9 January 2026 | CUSHION                 | 14      | Output=10380, OK=724, NG=380 |
| 124  | 9 January 2026 | ARM LOCK                | 14      | Output=450, OK=1073, NG=10   |
| 126  | 9 January 2026 | HOLDER MIRROR K97G RH   | 17      | Output=1008, OK=790, NG=108  |
| 127  | 9 January 2026 | HOLDER MIRROR K97G LH   | 17      | Output=1012, OK=724, NG=87   |
| 128  | 9 January 2026 | LOWER COVER CONSOLE BOX | 18      | Output=1280, OK=1073, NG=60  |
| 129  | 9 January 2026 | ELEMENT VARIO KVB       | 20      | Output=502, OK=1600, NG=2    |

### PROD_CATEGORY_ERROR

| Line | Date             | Part         | Machine | Detail                 |
| ---- | ---------------- | ------------ | ------- | ---------------------- |
| 595  | 11 February 2026 | 7171-7402-30 | 6       | Kategori bernilai #N/A |
| 613  | 12 February 2026 | 7171-7403-30 | 6       | Kategori bernilai #N/A |
| 653  | 14 February 2026 | 7171-7403-30 | 6       | Kategori bernilai #N/A |
| 691  | 17 February 2026 |              | 1       | Kategori bernilai #N/A |
| 692  | 17 February 2026 |              | 2       | Kategori bernilai #N/A |
| 693  | 17 February 2026 |              | 3       | Kategori bernilai #N/A |
| 784  | 23 February 2026 | 7171-7402-30 | 6       | Kategori bernilai #N/A |
| 785  | 23 February 2026 | 7171-7403-30 | 6       | Kategori bernilai #N/A |
| 808  | 24 February 2026 | 7171-7402-30 | 6       | Kategori bernilai #N/A |
| 986  | 5 March 2026     | 7171-7403-30 | 6       | Kategori bernilai #N/A |
| 987  | 5 March 2026     | 7171-7402-30 | 6       | Kategori bernilai #N/A |
| 1009 | 6 March 2026     | 7171-7402-30 | 6       | Kategori bernilai #N/A |
| 1080 | 10 March 2026    | 7171-7402-30 | 6       | Kategori bernilai #N/A |
| 1081 | 10 March 2026    | 7171-7403-30 | 6       | Kategori bernilai #N/A |

### PROD_MISSING_IN_MASTER

| Line | Date             | Part         | Machine | Detail                         |
| ---- | ---------------- | ------------ | ------- | ------------------------------ |
| 595  | 11 February 2026 | 7171-7402-30 | 6       | Part tidak ditemukan di master |
| 613  | 12 February 2026 | 7171-7403-30 | 6       | Part tidak ditemukan di master |
| 653  | 14 February 2026 | 7171-7403-30 | 6       | Part tidak ditemukan di master |
| 784  | 23 February 2026 | 7171-7402-30 | 6       | Part tidak ditemukan di master |
| 785  | 23 February 2026 | 7171-7403-30 | 6       | Part tidak ditemukan di master |
| 808  | 24 February 2026 | 7171-7402-30 | 6       | Part tidak ditemukan di master |
| 986  | 5 March 2026     | 7171-7403-30 | 6       | Part tidak ditemukan di master |
| 987  | 5 March 2026     | 7171-7402-30 | 6       | Part tidak ditemukan di master |
| 1009 | 6 March 2026     | 7171-7402-30 | 6       | Part tidak ditemukan di master |
| 1080 | 10 March 2026    | 7171-7402-30 | 6       | Part tidak ditemukan di master |
| 1081 | 10 March 2026    | 7171-7403-30 | 6       | Part tidak ditemukan di master |

### PROD_BLANK_PART

| Line | Date             | Part | Machine | Detail           |
| ---- | ---------------- | ---- | ------- | ---------------- |
| 691  | 17 February 2026 |      | 1       | Nama part kosong |
| 692  | 17 February 2026 |      | 2       | Nama part kosong |
| 693  | 17 February 2026 |      | 3       | Nama part kosong |

### PROD_DIV_ZERO

| Line | Date             | Part | Machine | Detail                   |
| ---- | ---------------- | ---- | ------- | ------------------------ |
| 691  | 17 February 2026 |      | 1       | Yield mengandung #DIV/0! |
| 692  | 17 February 2026 |      | 2       | Yield mengandung #DIV/0! |
| 693  | 17 February 2026 |      | 3       | Yield mengandung #DIV/0! |
