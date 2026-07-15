import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

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

const NAVY: [number, number, number] = [30, 58, 95];
const ORANGE: [number, number, number] = [249, 115, 22];
const SLATE: [number, number, number] = [51, 65, 85];
const SUBTOTAL: [number, number, number] = [255, 244, 230];
const ZEBRA: [number, number, number] = [248, 250, 252];
const SUCCESS: [number, number, number] = [21, 128, 61];
const WARN: [number, number, number] = [180, 83, 9];
const DANGER: [number, number, number] = [185, 28, 28];

function fmtN(n: number) {
  return n.toLocaleString("id-ID");
}
function fmtP(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}
function passRateColor(y: number): [number, number, number] {
  if (y >= 0.98) return SUCCESS;
  if (y >= 0.95) return WARN;
  return DANGER;
}

export function exportLaporanPDF(opts: {
  reports: Report[];
  year: number;
  month: number;
  filterMesin?: number | "";
  filterKategori?: string;
}) {
  const { reports, year, month, filterMesin, filterKategori } = opts;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 10;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("PT. INJEKSI PLASTIK PASIFIK", pageW / 2, 9, { align: "center" });

  doc.setFillColor(...ORANGE);
  doc.rect(0, 14, pageW, 8, "F");
  doc.setFontSize(10);
  doc.text(
    `LAPORAN INSPEKSI HARIAN — ${format(new Date(year, month - 1), "MMMM yyyy", { locale: idLocale }).toUpperCase()}`,
    pageW / 2,
    19.5,
    { align: "center" },
  );

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  const meta = [
    `Meja: ${filterMesin ? `Meja-${filterMesin}` : "Semua"}`,
    `Kategori: ${filterKategori || "Semua"}`,
    `Total: ${reports.length} laporan`,
    `Dicetak: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: idLocale })}`,
  ].join("   |   ");
  doc.text(meta, pageW / 2, 26, { align: "center" });

  const sorted = [...reports].sort((a, b) => {
    if (a.report_date !== b.report_date) return a.report_date.localeCompare(b.report_date);
    if (a.shift !== b.shift) return a.shift.localeCompare(b.shift);
    return a.no_meja - b.no_meja;
  });

  type Row = (string | number)[];
  const body: Row[] = [];
  const rowMeta: { type: "data" | "dateBanner" | "subtotal" | "grand"; passRate?: number }[] = [];

  let no = 1;
  const grand = { qty_check: 0, ok: 0, ng: 0, count: 0 };

  const byDate = new Map<string, Report[]>();
  for (const r of sorted) {
    if (!byDate.has(r.report_date)) byDate.set(r.report_date, []);
    byDate.get(r.report_date)!.push(r);
  }

  for (const [date, dateRows] of byDate) {
    body.push([
      `📅  ${format(new Date(date), "EEEE, dd MMMM yyyy", { locale: idLocale })}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    rowMeta.push({ type: "dateBanner" });

    const byShift = new Map<string, Report[]>();
    for (const r of dateRows) {
      if (!byShift.has(r.shift)) byShift.set(r.shift, []);
      byShift.get(r.shift)!.push(r);
    }

    for (const [shift, shiftRows] of byShift) {
      const sub = { qty_check: 0, ok: 0, ng: 0 };
      for (const r of shiftRows) {
        const totalOk = r.total_ok ?? 0;
        const passRate = r.qty_check > 0 ? totalOk / r.qty_check : 0;
        body.push([
          no++,
          format(new Date(r.report_date), "dd-MM-yy"),
          r.shift,
          `Meja-${r.no_meja}`,
          r.part_no,
          r.part_name,
          fmtN(r.qty_check),
          fmtN(totalOk),
          fmtN(r.total_ng),
          fmtP(passRate),
        ]);
        rowMeta.push({ type: "data", passRate });
        sub.qty_check += r.qty_check;
        sub.ok += totalOk;
        sub.ng += r.total_ng;
      }
      const subPassRate = sub.qty_check > 0 ? sub.ok / sub.qty_check : 0;
      body.push([
        `Subtotal Shift ${shift} (${shiftRows.length} laporan)`,
        "",
        "",
        "",
        "",
        "",
        fmtN(sub.qty_check),
        fmtN(sub.ok),
        fmtN(sub.ng),
        fmtP(subPassRate),
      ]);
      rowMeta.push({ type: "subtotal" });
      grand.qty_check += sub.qty_check;
      grand.ok += sub.ok;
      grand.ng += sub.ng;
      grand.count += shiftRows.length;
    }
  }

  if (sorted.length > 0) {
    const gPassRate = grand.qty_check > 0 ? grand.ok / grand.qty_check : 0;
    body.push([
      `GRAND TOTAL (${grand.count} laporan)`,
      "",
      "",
      "",
      "",
      "",
      fmtN(grand.qty_check),
      fmtN(grand.ok),
      fmtN(grand.ng),
      fmtP(gPassRate),
    ]);
    rowMeta.push({ type: "grand" });
  }

  autoTable(doc, {
    startY: 30,
    margin: { left: M, right: M, top: 30, bottom: 12 },
    head: [
      [
        "No",
        "Tanggal",
        "Shift",
        "Meja",
        "Part No",
        "Part Name",
        "Qty Check",
        "OK",
        "NG",
        "Pass Rate",
      ],
    ],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 1.6,
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      fontSize: 8.5,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "center", cellWidth: 12 },
      3: { halign: "center", cellWidth: 14 },
      4: { halign: "center", cellWidth: 18 },
      5: { halign: "left" },
      6: { halign: "right", cellWidth: 22 },
      7: { halign: "right", cellWidth: 22 },
      8: { halign: "right", cellWidth: 22 },
      9: { halign: "right", cellWidth: 20, fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: ZEBRA },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const meta = rowMeta[data.row.index];
      if (!meta) return;
      if (meta.type === "dateBanner") {
        data.cell.styles.fillColor = SLATE;
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.halign = "left";
        data.cell.styles.fontSize = 9;
      } else if (meta.type === "subtotal") {
        data.cell.styles.fillColor = SUBTOTAL;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [30, 41, 59];
        if (data.column.index === 0) data.cell.styles.halign = "right";
      } else if (meta.type === "grand") {
        data.cell.styles.fillColor = NAVY;
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9;
        if (data.column.index === 0) data.cell.styles.halign = "right";
        if (data.column.index === 9) {
          data.cell.styles.fillColor = ORANGE;
          data.cell.styles.textColor = NAVY;
        }
      } else if (meta.type === "data") {
        if (data.column.index === 7) data.cell.styles.textColor = SUCCESS;
        if (data.column.index === 8) data.cell.styles.textColor = DANGER;
        if (data.column.index === 9) {
          data.cell.styles.textColor = passRateColor(meta.passRate ?? 0);
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    didDrawCell: (data) => {
      if (data.section === "body") {
        const meta = rowMeta[data.row.index];
        if (meta?.type === "dateBanner" && data.column.index === 0) {
          const tableW = pageW - 2 * M;
          doc.setFillColor(...SLATE);
          doc.rect(data.cell.x, data.cell.y, tableW, data.cell.height, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text(
            String(data.cell.raw ?? ""),
            data.cell.x + 2,
            data.cell.y + data.cell.height / 2 + 1.2,
          );
        }
      }
    },
    didDrawPage: () => {
      const internal = doc.internal as unknown as {
        getCurrentPageInfo: () => { pageNumber: number };
        getNumberOfPages: () => number;
      };
      const page = internal.getCurrentPageInfo().pageNumber;
      const total = internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text(
        `IPP Inspection Daily Report  •  Generated ${format(new Date(), "dd MMM yyyy HH:mm", { locale: idLocale })}`,
        M,
        pageH - 5,
      );
      doc.text(`Halaman ${page} / ${total}`, pageW - M, pageH - 5, { align: "right" });
    },
  });

  doc.save(`IPP_Laporan_${year}-${String(month).padStart(2, "0")}.pdf`);
}
