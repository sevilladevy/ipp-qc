import ExcelJS from "exceljs";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import { DEFECT_COLUMNS } from "./format";

type Report = {
  id: string;
  report_date: string;
  shift: string;
  no_meja: number;
  part_no: string;
  part_name: string;
  qty_check: number;
  total_ok: number | null;
  total_ng: number;
};

type DefectDetail = Tables<"inspection_defect_details">;

const NAVY = "FF1E3A5F";
const ORANGE = "FFF97316";
const SUBTOTAL_FILL = "FFFFF4E6";
const HEADER_TEXT = "FFFFFFFF";
const ZEBRA = "FFF8FAFC";
const BORDER_COLOR = "FFCBD5E1";

const thinBorder = {
  top: { style: "thin" as const, color: { argb: BORDER_COLOR } },
  left: { style: "thin" as const, color: { argb: BORDER_COLOR } },
  bottom: { style: "thin" as const, color: { argb: BORDER_COLOR } },
  right: { style: "thin" as const, color: { argb: BORDER_COLOR } },
};

export async function exportLaporanExcel(opts: {
  reports: Report[];
  details: DefectDetail[];
  year: number;
  month: number;
  filterMesin?: number | "";
  filterKategori?: string;
}) {
  const { reports, details, year, month, filterMesin, filterKategori } = opts;

  const wb = new ExcelJS.Workbook();
  wb.creator = "IPP Inspection System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Laporan Inspeksi", {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    views: [{ state: "frozen", ySplit: 6, xSplit: 0 }],
  });

  const baseCols = [
    { header: "No", key: "no", width: 5 },
    { header: "Tanggal", key: "tanggal", width: 12 },
    { header: "Shift", key: "shift", width: 7 },
    { header: "Meja", key: "meja", width: 8 },
    { header: "Part No", key: "part_no", width: 14 },
    { header: "Part Name", key: "part_name", width: 28 },
    { header: "Qty Check", key: "qty_check", width: 12 },
    { header: "OK", key: "ok", width: 10 },
    { header: "NG", key: "ng", width: 10 },
    { header: "Pass Rate", key: "pass_rate", width: 10 },
  ];

  const extraKeys = new Set<string>();
  for (const d of details) {
    const e = (d.extra_defects ?? {}) as Record<string, number>;
    for (const k of Object.keys(e)) if ((e[k] ?? 0) > 0) extraKeys.add(k);
  }
  const extraKeyList = Array.from(extraKeys).sort();

  const defectCols = DEFECT_COLUMNS.map((c) => ({
    header: c.label,
    key: `def_${c.key}`,
    width: 12,
  }));
  const extraCols = extraKeyList.map((k) => ({ header: k, key: `ex_${k}`, width: 12 }));

  ws.columns = [...baseCols, ...defectCols, ...extraCols];
  const totalCols = ws.columns.length;
  const lastColLetter = ws.getColumn(totalCols).letter;

  ws.mergeCells(`A1:${lastColLetter}1`);
  const r1 = ws.getCell("A1");
  r1.value = "PT. INJEKSI PLASTIK PASIFIK";
  r1.font = { name: "Arial", size: 16, bold: true, color: { argb: HEADER_TEXT } };
  r1.alignment = { horizontal: "center", vertical: "middle" };
  r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  ws.getRow(1).height = 26;

  ws.mergeCells(`A2:${lastColLetter}2`);
  const r2 = ws.getCell("A2");
  r2.value = `LAPORAN INSPEKSI HARIAN — ${format(new Date(year, month - 1), "MMMM yyyy", { locale: idLocale }).toUpperCase()}`;
  r2.font = { name: "Arial", size: 12, bold: true, color: { argb: HEADER_TEXT } };
  r2.alignment = { horizontal: "center", vertical: "middle" };
  r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ORANGE } };
  ws.getRow(2).height = 22;

  ws.mergeCells(`A3:${lastColLetter}3`);
  const metaParts = [
    `Periode: ${format(new Date(year, month - 1), "MMMM yyyy", { locale: idLocale })}`,
    `Meja: ${filterMesin ? `Meja-${filterMesin}` : "Semua"}`,
    `Kategori: ${filterKategori || "Semua"}`,
    `Dicetak: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: idLocale })}`,
  ];
  const r3 = ws.getCell("A3");
  r3.value = metaParts.join("    |    ");
  r3.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF475569" } };
  r3.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(3).height = 18;

  ws.getRow(4).height = 6;

  const r5 = ws.getRow(5);
  ws.mergeCells("A5:F5");
  ws.getCell("A5").value = "INFORMASI INSPEKSI";
  ws.mergeCells("G5:J5");
  ws.getCell("G5").value = "RINGKASAN INSPEKSI";
  if (defectCols.length + extraCols.length > 0) {
    const startLetter = ws.getColumn(11).letter;
    const endLetter = lastColLetter;
    ws.mergeCells(`${startLetter}5:${endLetter}5`);
    ws.getCell(`${startLetter}5`).value = "BREAKDOWN DEFECT";
  }
  ["A5", "G5", "K5"].forEach((addr) => {
    const c = ws.getCell(addr);
    c.font = { name: "Arial", size: 10, bold: true, color: { argb: HEADER_TEXT } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.border = thinBorder;
  });
  r5.height = 20;

  const headerRow = ws.getRow(6);
  ws.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = String(col.header ?? "");
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: HEADER_TEXT } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.border = thinBorder;
  });
  headerRow.height = 32;

  const detailMap = new Map<string, DefectDetail>();
  for (const d of details) detailMap.set(d.report_id, d);

  const sorted = [...reports].sort((a, b) => {
    if (a.report_date !== b.report_date) return a.report_date.localeCompare(b.report_date);
    if (a.shift !== b.shift) return a.shift.localeCompare(b.shift);
    return a.no_meja - b.no_meja;
  });

  let currentRow = 7;
  let no = 1;

  const byDate = new Map<string, Report[]>();
  for (const r of sorted) {
    if (!byDate.has(r.report_date)) byDate.set(r.report_date, []);
    byDate.get(r.report_date)!.push(r);
  }

  const grandTotals = { qty_check: 0, ok: 0, ng: 0 };
  const grandDefects: Record<string, number> = {};
  const grandExtras: Record<string, number> = {};

  for (const [date, dateRows] of byDate) {
    ws.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
    const dCell = ws.getCell(`A${currentRow}`);
    dCell.value = `📅  ${format(new Date(date), "EEEE, dd MMMM yyyy", { locale: idLocale })}`;
    dCell.font = { name: "Arial", size: 10, bold: true, color: { argb: HEADER_TEXT } };
    dCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    dCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    ws.getRow(currentRow).height = 20;
    currentRow++;

    const byShift = new Map<string, Report[]>();
    for (const r of dateRows) {
      if (!byShift.has(r.shift)) byShift.set(r.shift, []);
      byShift.get(r.shift)!.push(r);
    }

    for (const [shift, shiftRows] of byShift) {
      const shiftTotals = { qty_check: 0, ok: 0, ng: 0 };
      const shiftDefects: Record<string, number> = {};
      const shiftExtras: Record<string, number> = {};

      let zebra = false;
      for (const r of shiftRows) {
        // Legacy reports may lack a detail row; emit zeros instead of
        // dropping the report so Excel matches UI totals.
        const detail = detailMap.get(r.id) ?? null;
        const row = ws.getRow(currentRow);

        row.getCell(1).value = no++;
        row.getCell(2).value = format(new Date(r.report_date), "dd-MM-yyyy");
        row.getCell(3).value = r.shift;
        row.getCell(4).value = `Meja-${r.no_meja}`;
        row.getCell(5).value = r.part_no;
        row.getCell(6).value = r.part_name;
        row.getCell(7).value = r.qty_check;
        row.getCell(8).value = r.total_ok ?? 0;
        row.getCell(9).value = r.total_ng;
        row.getCell(10).value = r.qty_check > 0 ? (r.total_ok ?? 0) / r.qty_check : 0;

        shiftTotals.qty_check += r.qty_check;
        shiftTotals.ok += r.total_ok ?? 0;
        shiftTotals.ng += r.total_ng;

        DEFECT_COLUMNS.forEach((c, i) => {
          const defectValues = (detail ?? {}) as unknown as Record<
            string,
            number | null | undefined
          >;
          const v = Number(defectValues[c.key] ?? 0);
          row.getCell(11 + i).value = v || null;
          if (v) shiftDefects[c.key] = (shiftDefects[c.key] ?? 0) + v;
        });

        const extras = (detail?.extra_defects ?? {}) as Record<string, number>;
        extraKeyList.forEach((k, i) => {
          const v = Number(extras[k] ?? 0);
          row.getCell(11 + DEFECT_COLUMNS.length + i).value = v || null;
          if (v) shiftExtras[k] = (shiftExtras[k] ?? 0) + v;
        });

        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cell.font = { name: "Arial", size: 9 };
          cell.border = thinBorder;
          cell.alignment = {
            horizontal: col >= 7 ? "right" : col === 6 ? "left" : "center",
            vertical: "middle",
          };
          if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
        });
        [7, 8, 9].forEach((c) => (row.getCell(c).numFmt = "#,##0"));
        row.getCell(10).numFmt = "0.00%";
        for (let c = 11; c <= totalCols; c++) row.getCell(c).numFmt = "#,##0;;-";
        const passRate = r.qty_check > 0 ? (r.total_ok ?? 0) / r.qty_check : 0;
        const yColor = passRate >= 0.98 ? "FF15803D" : passRate >= 0.95 ? "FFB45309" : "FFB91C1C";
        row.getCell(10).font = { name: "Arial", size: 9, bold: true, color: { argb: yColor } };
        row.getCell(8).font = { name: "Arial", size: 9, color: { argb: "FF15803D" } };
        row.getCell(9).font = { name: "Arial", size: 9, color: { argb: "FFB91C1C" } };

        zebra = !zebra;
        currentRow++;
      }

      const sRow = ws.getRow(currentRow);
      ws.mergeCells(`A${currentRow}:F${currentRow}`);
      sRow.getCell(1).value = `Subtotal Shift ${shift}  (${shiftRows.length} laporan)`;
      sRow.getCell(7).value = shiftTotals.qty_check;
      sRow.getCell(8).value = shiftTotals.ok;
      sRow.getCell(9).value = shiftTotals.ng;
      sRow.getCell(10).value =
        shiftTotals.qty_check > 0 ? shiftTotals.ok / shiftTotals.qty_check : 0;
      DEFECT_COLUMNS.forEach((c, i) => {
        sRow.getCell(11 + i).value = shiftDefects[c.key] || null;
      });
      extraKeyList.forEach((k, i) => {
        sRow.getCell(11 + DEFECT_COLUMNS.length + i).value = shiftExtras[k] || null;
      });
      sRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = { name: "Arial", size: 9, bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBTOTAL_FILL } };
        cell.border = thinBorder;
        cell.alignment = {
          horizontal: col >= 7 ? "right" : col === 1 ? "right" : "center",
          vertical: "middle",
        };
      });
      [7, 8, 9].forEach((c) => (sRow.getCell(c).numFmt = "#,##0"));
      sRow.getCell(10).numFmt = "0.00%";
      for (let c = 11; c <= totalCols; c++) sRow.getCell(c).numFmt = "#,##0;;-";
      sRow.height = 18;
      currentRow++;

      grandTotals.qty_check += shiftTotals.qty_check;
      grandTotals.ok += shiftTotals.ok;
      grandTotals.ng += shiftTotals.ng;
      for (const k in shiftDefects) grandDefects[k] = (grandDefects[k] ?? 0) + shiftDefects[k];
      for (const k in shiftExtras) grandExtras[k] = (grandExtras[k] ?? 0) + shiftExtras[k];
    }
  }

  if (sorted.length > 0) {
    const gRow = ws.getRow(currentRow);
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    gRow.getCell(1).value = `GRAND TOTAL  (${sorted.length} laporan)`;
    gRow.getCell(7).value = grandTotals.qty_check;
    gRow.getCell(8).value = grandTotals.ok;
    gRow.getCell(9).value = grandTotals.ng;
    gRow.getCell(10).value = grandTotals.qty_check > 0 ? grandTotals.ok / grandTotals.qty_check : 0;
    DEFECT_COLUMNS.forEach((c, i) => {
      gRow.getCell(11 + i).value = grandDefects[c.key] || null;
    });
    extraKeyList.forEach((k, i) => {
      gRow.getCell(11 + DEFECT_COLUMNS.length + i).value = grandExtras[k] || null;
    });
    gRow.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: HEADER_TEXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      cell.border = thinBorder;
      cell.alignment = {
        horizontal: col >= 7 ? "right" : col === 1 ? "right" : "center",
        vertical: "middle",
      };
    });
    [7, 8, 9].forEach((c) => (gRow.getCell(c).numFmt = "#,##0"));
    gRow.getCell(10).numFmt = "0.00%";
    for (let c = 11; c <= totalCols; c++) gRow.getCell(c).numFmt = "#,##0;;-";
    gRow.height = 22;
    currentRow++;

    gRow.getCell(10).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ORANGE } };
    gRow.getCell(10).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1E3A5F" } };
  }

  currentRow += 1;
  ws.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
  const footer = ws.getCell(`A${currentRow}`);
  footer.value = `IPP Inspection Daily Report  •  Generated ${format(new Date(), "dd MMM yyyy HH:mm", { locale: idLocale })}`;
  footer.font = { name: "Arial", size: 8, italic: true, color: { argb: "FF94A3B8" } };
  footer.alignment = { horizontal: "center" };

  ws.pageSetup.printTitlesRow = "1:6";
  ws.pageSetup.margins = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `IPP_Laporan_${year}-${String(month).padStart(2, "0")}.xlsx`;
  try {
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
