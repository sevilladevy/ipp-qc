import { format } from "date-fns";
import pptxgen from "pptxgenjs";
import type { ExportColumn } from "./table-export";
import type { AggregatedReportRow } from "./management";

// ─── Color palette (professional boardroom theme) ───────────────────────────
const C = {
  navy: "1E3A5F",
  navyLight: "2C5282",
  accent: "3182CE",
  white: "FFFFFF",
  grayBg: "F7FAFC",
  grayText: "4A5568",
  darkText: "1A202C",
  success: "38A169",
  warning: "D69E2E",
  danger: "E53E3E",
  border: "CBD5E1",
  muted: "718096",
};

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return `${(n * 100).toFixed(digits)}%`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "-";
  return n.toLocaleString("id-ID");
}

// ─── Slide helpers ──────────────────────────────────────────────────────────

function addSlideHeader(slide: pptxgen.Slide, title: string) {
  // Accent bar at top
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: C.accent } });
  // Title
  slide.addText(title, {
    x: 0.5,
    y: 0.25,
    w: 12.3,
    h: 0.45,
    fontSize: 22,
    bold: true,
    color: C.navy,
    fontFace: "Calibri",
  });
  // Subtle separator line
  slide.addShape("rect", { x: 0.5, y: 0.72, w: 2.5, h: 0.03, fill: { color: C.accent } });
}

function addSlideFooter(slide: pptxgen.Slide, pageLabel = "") {
  slide.addText(`IPP Quality · Monthly KPI Report${pageLabel ? " — " + pageLabel : ""}`, {
    x: 0.5,
    y: 6.2,
    w: 8,
    h: 0.2,
    fontSize: 8,
    color: C.muted,
    fontFace: "Calibri",
  });
  slide.addText(format(new Date(), "dd MMM yyyy"), {
    x: 10.5,
    y: 6.2,
    w: 2.5,
    h: 0.2,
    fontSize: 8,
    color: C.muted,
    align: "right",
    fontFace: "Calibri",
  });
}

// ─── 1. Title slide ────────────────────────────────────────────────────────

function addTitleSlide(pptx: pptxgen.Presentation, monthYear: string) {
  const slide = pptx.addSlide();
  // Full navy background
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: C.navy } });
  // Left accent stripe
  slide.addShape("rect", { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.accent } });
  // Top accent line
  slide.addShape("rect", { x: 0.18, y: 0, w: 13.15, h: 0.08, fill: { color: C.accent } });

  // Main title block
  slide.addText("DEPARTMENT QUALITY", {
    x: 0.8,
    y: 1.8,
    w: 11.7,
    h: 0.5,
    fontSize: 16,
    color: "A0C4F0",
    fontFace: "Calibri",
    charSpacing: 4,
  });
  slide.addText("LAPORAN KPI BULANAN", {
    x: 0.8,
    y: 2.3,
    w: 11.7,
    h: 1.0,
    fontSize: 40,
    bold: true,
    color: C.white,
    fontFace: "Calibri",
  });
  slide.addText(monthYear, {
    x: 0.8,
    y: 3.3,
    w: 11.7,
    h: 0.6,
    fontSize: 28,
    color: "90CDF4",
    fontFace: "Calibri",
  });
  // Separator
  slide.addShape("rect", { x: 0.8, y: 4.05, w: 3.5, h: 0.05, fill: { color: C.accent } });
  // Subtitle
  slide.addText("Production Inspection & Quality Control System", {
    x: 0.8,
    y: 4.3,
    w: 11.7,
    h: 0.4,
    fontSize: 13,
    color: "A0AEC0",
    fontFace: "Calibri",
  });

  // Bottom presenter block
  slide.addShape("rect", { x: 0, y: 6.2, w: 13.33, h: 1.3, fill: { color: C.navyLight } });
  slide.addText("Presented by", {
    x: 0.8,
    y: 6.4,
    w: 11.7,
    h: 0.3,
    fontSize: 11,
    color: "A0AEC0",
    fontFace: "Calibri",
  });
  slide.addText("Ariyanto", {
    x: 0.8,
    y: 6.7,
    w: 11.7,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: C.white,
    fontFace: "Calibri",
  });
  slide.addText("Quality Department · IPP Production", {
    x: 0.8,
    y: 7.15,
    w: 11.7,
    h: 0.25,
    fontSize: 10,
    color: "A0AEC0",
    fontFace: "Calibri",
  });
}

// ─── 2. Executive Summary slide ───────────────────────────────────────────

function addSummarySlide(
  pptx: pptxgen.Presentation,
  totals: {
    qty_check: number;
    ok: number;
    ng: number;
    yieldAvg: number;
    ngRate: number;
    reportCount: number;
    activeMejas: number;
  },
  from: string,
  to: string,
) {
  const slide = pptx.addSlide();
  addSlideHeader(slide, "Executive Summary");
  addSlideFooter(slide);

  // Period label
  slide.addText(
    `Periode: ${format(new Date(from), "dd MMM yyyy")} – ${format(new Date(to), "dd MMM yyyy")}`,
    { x: 0.5, y: 0.9, w: 12.3, h: 0.3, fontSize: 11, color: C.muted, fontFace: "Calibri" },
  );

  // 5 KPI cards in a row
  const cardW = 2.2;
  const cardH = 1.6;
  const cardGap = 0.2;
  const startX = 0.5;
  const startY = 1.4;
  const totalW = cardW * 5 + cardGap * 4;
  let offsetX = startX + (13.33 - totalW) / 2;

  interface KpiItem {
    label: string;
    value: string;
    sub: string;
    color: string;
    bgColor: string;
  }
  const kpis: KpiItem[] = [
    {
      label: "Total Output",
      value: fmtNum(totals.qty_check),
      sub: `OK ${fmtNum(totals.ok)}`,
      color: C.navy,
      bgColor: "EBF4FF",
    },
    {
      label: "Yield Rate",
      value: fmtPct(totals.yieldAvg),
      sub:
        totals.yieldAvg >= 0.97
          ? "Target ✅"
          : totals.yieldAvg >= 0.95
            ? "Approaching"
            : "Below Target ⚠️",
      color: totals.yieldAvg >= 0.97 ? C.success : totals.yieldAvg >= 0.95 ? C.warning : C.danger,
      bgColor: totals.yieldAvg >= 0.97 ? "C6F6D5" : totals.yieldAvg >= 0.95 ? "FEFCBF" : "FED7D7",
    },
    {
      label: "NG Count",
      value: fmtNum(totals.ng),
      sub: `Rate ${fmtPct(totals.ngRate)}`,
      color: C.danger,
      bgColor: "FED7D7",
    },
    {
      label: "Reports",
      value: fmtNum(totals.reportCount),
      sub: `${totals.activeMejas} meja aktif`,
      color: C.accent,
      bgColor: "EBF4FF",
    },
    {
      label: "Quality Score",
      value: "—",
      sub: "see detailed analysis",
      color: C.grayText,
      bgColor: C.grayBg,
    },
  ];

  for (const kpi of kpis) {
    slide.addShape("rect", {
      x: offsetX,
      y: startY,
      w: cardW,
      h: cardH,
      fill: { color: kpi.bgColor },
      line: { color: C.border, width: 1 },
      shadow: { type: "outer", blur: 3, offset: 1, angle: 135, opacity: 0.1 },
    });
    slide.addText(kpi.label, {
      x: offsetX,
      y: startY + 0.1,
      w: cardW,
      h: 0.3,
      fontSize: 9,
      bold: true,
      color: C.muted,
      align: "center",
      fontFace: "Calibri",
      charSpacing: 1,
    });
    slide.addText(kpi.value, {
      x: offsetX,
      y: startY + 0.4,
      w: cardW,
      h: 0.55,
      fontSize: 24,
      bold: true,
      color: kpi.color,
      align: "center",
      fontFace: "Calibri",
    });
    slide.addText(kpi.sub, {
      x: offsetX,
      y: startY + 1.0,
      w: cardW,
      h: 0.4,
      fontSize: 9,
      color: C.grayText,
      align: "center",
      fontFace: "Calibri",
    });
    offsetX += cardW + cardGap;
  }

  // Key findings section
  slide.addText("Key Findings", {
    x: 0.5,
    y: 3.3,
    w: 12.3,
    h: 0.35,
    fontSize: 13,
    bold: true,
    color: C.navy,
    fontFace: "Calibri",
  });

  const findings = buildKeyFindings(totals);
  findings.forEach((finding, i) => {
    const fy = 3.75 + i * 0.45;
    // Bullet
    slide.addShape("rect", {
      x: 0.5,
      y: fy + 0.08,
      w: 0.08,
      h: 0.08,
      fill: { color: finding.dotColor },
    });
    slide.addText(finding.text, {
      x: 0.75,
      y: fy,
      w: 12.0,
      h: 0.35,
      fontSize: 11,
      color: C.darkText,
      fontFace: "Calibri",
    });
  });
}

function buildKeyFindings(totals: {
  qty_check: number;
  ok: number;
  ng: number;
  yieldAvg: number;
  ngRate: number;
  reportCount: number;
  activeMejas: number;
}): { text: string; dotColor: string }[] {
  const findings: { text: string; dotColor: string }[] = [];
  const yieldPct = Math.round(totals.yieldAvg * 100);
  const ngPct = Math.round(totals.ngRate * 100);

  if (totals.yieldAvg >= 0.97) {
    findings.push({
      text: `Yield rate ${yieldPct}% memenuhi target ≥97% — performa baik`,
      dotColor: C.success,
    });
  } else if (totals.yieldAvg >= 0.95) {
    findings.push({
      text: `Yield rate ${yieldPct}% masih dalam batas acceptable (95-97%), perlu perbaikan`,
      dotColor: C.warning,
    });
  } else {
    findings.push({
      text: `Yield rate ${yieldPct}% di bawah target 95% — perlu tindakan korektif segera`,
      dotColor: C.danger,
    });
  }

  findings.push({
    text: `${totals.activeMejas} meja produksi aktif menghasilkan ${totals.reportCount} laporan inspeksi`,
    dotColor: C.accent,
  });

  findings.push({
    text: `Total NG ${fmtNum(totals.ng)} unit (${ngPct}%) dari ${fmtNum(totals.qty_check)} unit yang diinspeksi`,
    dotColor: C.grayText,
  });

  return findings;
}

// ─── 3. Trend slide ────────────────────────────────────────────────────────

function addTrendSlide(
  pptx: pptxgen.Presentation,
  trend: { date: string; qty_check: number; ngRate: number; passRate: number; reports: number }[],
) {
  const slide = pptx.addSlide();
  addSlideHeader(slide, "Output & Yield Trend");
  addSlideFooter(slide);

  if (!trend.length) {
    slide.addText("Tidak ada data trend untuk periode ini.", {
      x: 0.5,
      y: 2.5,
      w: 12.3,
      h: 0.5,
      fontSize: 14,
      color: C.muted,
      fontFace: "Calibri",
    });
    return;
  }

  // Chart data for pptxgen
  const chartData = trend.map((d) => ({
    name: format(new Date(d.date), "dd MMM"),
    "Qty Check": d.qty_check,
    "Yield %": d.passRate,
    "NG Rate %": d.ngRate,
  }));

  slide.addChart(pptx.charts.BAR, chartData, {
    x: 0.5,
    y: 1.0,
    w: 7.5,
    h: 3.5,
    chartColors: [C.accent, C.success, C.danger],
    showTitle: false,
    showLegend: true,
    legendPos: "b",
    dataLabelDisplay: ["hide", "hide", "hide"],
    dataLabelPosition: "outEnd",
    catLabelFontSize: 9,
    valLabelFontSize: 9,
    valAxisMaxValue: 100,
    valAxisMinValue: 0,
  });

  // Yield gauge on the right
  const latest = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const yieldDelta = latest ? (latest.passRate - (prev?.passRate ?? latest.passRate)) / 100 : 0;

  slide.addText("Yield Performance", {
    x: 8.3,
    y: 1.0,
    w: 4.5,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: C.navy,
    fontFace: "Calibri",
  });

  // Big yield number
  const gaugeColor =
    latest && latest.passRate >= 97
      ? C.success
      : latest && latest.passRate >= 95
        ? C.warning
        : C.danger;
  slide.addText(latest ? `${latest.passRate.toFixed(1)}%` : "—", {
    x: 8.3,
    y: 1.4,
    w: 4.5,
    h: 0.9,
    fontSize: 44,
    bold: true,
    color: gaugeColor,
    fontFace: "Calibri",
  });

  // Delta indicator
  if (prev && latest) {
    const deltaText =
      yieldDelta >= 0 ? `▲ +${yieldDelta.toFixed(1)}%` : `▼ ${yieldDelta.toFixed(1)}%`;
    const deltaColor = yieldDelta >= 0 ? C.success : C.danger;
    slide.addText(deltaText, {
      x: 8.3,
      y: 2.3,
      w: 4.5,
      h: 0.35,
      fontSize: 14,
      color: deltaColor,
      fontFace: "Calibri",
    });
  }

  // Table: last 5 entries
  const tableRows = [["Tanggal", "Qty", "Yield %", "NG %", "Reports"]];
  const recent = trend.slice(-5).reverse();
  for (const d of recent) {
    tableRows.push([
      format(new Date(d.date), "dd MMM"),
      d.qty_check.toLocaleString("id-ID"),
      d.passRate.toFixed(1),
      d.ngRate.toFixed(1),
      d.reports.toString(),
    ]);
  }

  slide.addTable(tableRows, {
    x: 8.3,
    y: 2.8,
    w: 4.5,
    h: 2.8,
    border: { pt: 0.5, color: C.border },
    fontSize: 9,
    fontFace: "Calibri",
    color: C.darkText,
    fill: { color: C.white },
    colW: [1.1, 0.9, 0.85, 0.85, 0.85],
    rowH: 0.3,
    valign: "middle",
  });
}

// ─── 4. Pareto slide ───────────────────────────────────────────────────────

function addParetoSlide(
  pptx: pptxgen.Presentation,
  pareto: { key: string; name: string; total: number; pct: number; cumPct: number }[],
) {
  const slide = pptx.addSlide();
  addSlideHeader(slide, "Defect Pareto Analysis");
  addSlideFooter(slide);

  if (!pareto.length) {
    slide.addText("Tidak ada data defect untuk periode ini.", {
      x: 0.5,
      y: 2.5,
      w: 12.3,
      h: 0.5,
      fontSize: 14,
      color: C.muted,
      fontFace: "Calibri",
    });
    return;
  }

  const top10 = pareto.slice(0, 10);
  const grandTotal = pareto.reduce((s, r) => s + r.total, 0);

  // Summary badge
  slide.addText(
    `Total Defect: ${grandTotal} pcs | Top 3: ${top10
      .slice(0, 3)
      .reduce((s, r) => s + r.total, 0)
      .toLocaleString()} pcs (${((top10.slice(0, 3).reduce((s, r) => s + r.total, 0) / grandTotal) * 100).toFixed(1)}%)`,
    { x: 0.5, y: 0.9, w: 12.3, h: 0.3, fontSize: 10, color: C.muted, fontFace: "Calibri" },
  );

  const chartData = top10.map((r) => ({
    name: r.name.length > 18 ? r.name.substring(0, 18) + "…" : r.name,
    Jumlah: r.total,
    "Cum %": r.cumPct,
  }));

  slide.addChart(pptx.charts.BAR, chartData, {
    x: 0.5,
    y: 1.3,
    w: 7.0,
    h: 4.0,
    chartColors: [C.accent],
    showTitle: false,
    showLegend: false,
    dataLabelDisplay: ["hide"],
    barDir: "bar",
    catLabelFontSize: 9,
    valLabelFontSize: 9,
    valGridLine: { style: "none" },
    catGridLine: { style: "dotted", color: C.border },
  });

  // Table: top 10 with details
  const tableRows = [["No", "Defect Type", "Jumlah", "% Kontribusi", "% Kumulatif"]];
  top10.forEach((r, i) => {
    tableRows.push([
      (i + 1).toString(),
      r.name,
      r.total.toLocaleString("id-ID"),
      r.pct.toFixed(1) + "%",
      r.cumPct.toFixed(1) + "%",
    ]);
  });

  slide.addTable(tableRows, {
    x: 7.8,
    y: 1.3,
    w: 5.0,
    h: 4.0,
    border: { pt: 0.5, color: C.border },
    fontSize: 9,
    fontFace: "Calibri",
    color: C.darkText,
    fill: { color: C.white },
    colW: [0.4, 2.5, 0.9, 0.8, 0.8],
    rowH: 0.28,
    valign: "middle",
  });

  // Insight box
  const topDefect = top10[0];
  if (topDefect) {
    slide.addShape("rect", {
      x: 0.5,
      y: 5.5,
      w: 12.3,
      h: 0.85,
      fill: { color: "EBF4FF" },
      line: { color: C.accent, width: 0.5 },
    });
    slide.addText("Rekomendasi Fokus:", {
      x: 0.7,
      y: 5.55,
      w: 3,
      h: 0.25,
      fontSize: 9,
      bold: true,
      color: C.navy,
      fontFace: "Calibri",
    });
    slide.addText(
      `Prioritas perbaikan: ${topDefect.name} (${topDefect.total} pcs, ${topDefect.pct.toFixed(1)}%). ${topDefect.cumPct >= 80 ? "Mengikuti prinsip Pareto (80/20) — fokus pada top defect akan memberikan dampak signifikan." : ""}`,
      { x: 0.7, y: 5.8, w: 11.8, h: 0.5, fontSize: 10, color: C.darkText, fontFace: "Calibri" },
    );
  }
}

// ─── 5. Meja & Shift comparison slide ──────────────────────────────────────

function addComparisonSlide(
  pptx: pptxgen.Presentation,
  mejaRows: AggregatedReportRow[],
  shiftRows: AggregatedReportRow[],
) {
  const slide = pptx.addSlide();
  addSlideHeader(slide, "Meja & Shift Performance Comparison");
  addSlideFooter(slide);

  // Left: Meja table
  slide.addText("Performance by Meja", {
    x: 0.5,
    y: 0.9,
    w: 5.8,
    h: 0.35,
    fontSize: 11,
    bold: true,
    color: C.navy,
    fontFace: "Calibri",
  });

  const mejaTableRows = [["Meja", "Qty Check", "Yield %", "NG %", "Reports"]];
  const sortedMeja = [...mejaRows].sort((a, b) => b.ngRate - a.ngRate).slice(0, 8);
  for (const r of sortedMeja) {
    mejaTableRows.push([
      `Meja ${r.key}`,
      r.qty_check.toLocaleString("id-ID"),
      (r.passRate * 100).toFixed(1),
      (r.ngRate * 100).toFixed(1),
      r.reports.toString(),
    ]);
  }
  slide.addTable(mejaTableRows, {
    x: 0.5,
    y: 1.3,
    w: 6.0,
    h: 4.0,
    border: { pt: 0.5, color: C.border },
    fontSize: 9,
    fontFace: "Calibri",
    color: C.darkText,
    fill: { color: C.white },
    colW: [1.0, 1.5, 1.0, 1.0, 1.0],
    rowH: 0.28,
    valign: "middle",
  });

  // Right: Shift table
  slide.addText("Performance by Shift", {
    x: 6.8,
    y: 0.9,
    w: 6.0,
    h: 0.35,
    fontSize: 11,
    bold: true,
    color: C.navy,
    fontFace: "Calibri",
  });

  const shiftTableRows = [["Shift", "Qty Check", "Yield %", "NG %", "Reports"]];
  const sortedShift = [...shiftRows].sort((a, b) => b.ngRate - a.ngRate);
  for (const r of sortedShift) {
    shiftTableRows.push([
      r.key,
      r.qty_check.toLocaleString("id-ID"),
      (r.passRate * 100).toFixed(1),
      (r.ngRate * 100).toFixed(1),
      r.reports.toString(),
    ]);
  }
  slide.addTable(shiftTableRows, {
    x: 6.8,
    y: 1.3,
    w: 6.0,
    h: 4.0,
    border: { pt: 0.5, color: C.border },
    fontSize: 9,
    fontFace: "Calibri",
    color: C.darkText,
    fill: { color: C.white },
    colW: [0.8, 1.5, 1.0, 1.0, 1.0],
    rowH: 0.28,
    valign: "middle",
  });

  // Insight
  const worstMeja = sortedMeja[0];
  if (worstMeja) {
    const insightColor =
      worstMeja.ngRate >= 0.05 ? C.danger : worstMeja.ngRate >= 0.03 ? C.warning : C.success;
    slide.addShape("rect", {
      x: 0.5,
      y: 5.5,
      w: 12.3,
      h: 0.7,
      fill: {
        color:
          insightColor === C.danger ? "FED7D7" : insightColor === C.warning ? "FEFCBF" : "C6F6D5",
      },
      line: { color: insightColor, width: 0.5 },
    });
    slide.addText(
      worstMeja.ngRate >= 0.05
        ? `⚠ Meja ${worstMeja.key} memerlukan perhatian — NG Rate ${(worstMeja.ngRate * 100).toFixed(1)}%`
        : `✅ Semua meja mencapai target NG Rate ≤5%`,
      {
        x: 0.7,
        y: 5.55,
        w: 11.8,
        h: 0.6,
        fontSize: 11,
        bold: true,
        color: insightColor,
        fontFace: "Calibri",
      },
    );
  }
}

// ─── 6. Closing slide ──────────────────────────────────────────────────────

function addClosingSlide(pptx: pptxgen.Presentation, monthYear: string) {
  const slide = pptx.addSlide();
  // Full navy background
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: C.navy } });
  // Left accent stripe
  slide.addShape("rect", { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.accent } });
  // Top accent line
  slide.addShape("rect", { x: 0.18, y: 0, w: 13.15, h: 0.08, fill: { color: C.accent } });

  slide.addText("Terima Kasih", {
    x: 0.8,
    y: 2.2,
    w: 11.7,
    h: 0.8,
    fontSize: 44,
    bold: true,
    color: C.white,
    fontFace: "Calibri",
  });
  slide.addText("Quality Department Monthly KPI Report", {
    x: 0.8,
    y: 3.0,
    w: 11.7,
    h: 0.5,
    fontSize: 18,
    color: "A0C4F0",
    fontFace: "Calibri",
  });
  slide.addText(monthYear, {
    x: 0.8,
    y: 3.55,
    w: 11.7,
    h: 0.5,
    fontSize: 24,
    color: "90CDF4",
    fontFace: "Calibri",
  });
  slide.addShape("rect", { x: 0.8, y: 4.2, w: 3.5, h: 0.05, fill: { color: C.accent } });
  slide.addText("Presented by", {
    x: 0.8,
    y: 4.5,
    w: 11.7,
    h: 0.3,
    fontSize: 12,
    color: "A0AEC0",
    fontFace: "Calibri",
  });
  slide.addText("Ariyanto", {
    x: 0.8,
    y: 4.85,
    w: 11.7,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: C.white,
    fontFace: "Calibri",
  });
  slide.addText("Quality Department · IPP Production", {
    x: 0.8,
    y: 5.5,
    w: 11.7,
    h: 0.3,
    fontSize: 12,
    color: "A0AEC0",
    fontFace: "Calibri",
  });

  // Footer bar
  slide.addShape("rect", { x: 0, y: 6.8, w: 13.33, h: 0.7, fill: { color: C.navyLight } });
  slide.addText("IPP Quality Management System  ·  Confidential", {
    x: 0.8,
    y: 6.95,
    w: 11.7,
    h: 0.4,
    fontSize: 10,
    color: "A0AEC0",
    fontFace: "Calibri",
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface KpiMonthlyPptxData {
  monthYear: string;
  from: string;
  to: string;
  totals: {
    qty_check: number;
    ok: number;
    ng: number;
    yieldAvg: number;
    ngRate: number;
    reportCount: number;
    activeMejas: number;
  };
  trend: {
    date: string;
    qty_check: number;
    ngRate: number;
    passRate: number;
    reports: number;
  }[];
  defectPareto: {
    key: string;
    name: string;
    total: number;
    pct: number;
    cumPct: number;
  }[];
  mejaRows: AggregatedReportRow[];
  shiftRows: AggregatedReportRow[];
}

export async function exportToKpiMonthlyPptx(opts: KpiMonthlyPptxData): Promise<string> {
  const { monthYear, from, to, totals, trend, defectPareto, mejaRows, shiftRows } = opts;

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "IPP Quality";
  pptx.company = "IPP";
  pptx.subject = `KPI Monthly Report ${monthYear}`;
  pptx.title = `Laporan KPI Bulanan ${monthYear}`;

  // Slide 1: Title
  addTitleSlide(pptx, monthYear);

  // Slide 2: Executive Summary
  addSummarySlide(pptx, totals, from, to);

  // Slide 3: Trend
  addTrendSlide(pptx, trend);

  // Slide 4: Pareto
  addParetoSlide(pptx, defectPareto);

  // Slide 5: Meja & Shift comparison
  addComparisonSlide(pptx, mejaRows, shiftRows);

  // Slide 6: Closing
  addClosingSlide(pptx, monthYear);

  const filename = `KPI_Monthly_Report_${monthYear.replace(/\s/g, "_")}.pptx`;
  await pptx.writeFile({ fileName: filename });
  return filename;
}

// ─── Legacy table export (unchanged) ───────────────────────────────────────

export async function exportToPowerPoint<T>(opts: {
  filename: string;
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
  subtitle?: string;
}) {
  const { filename, title, columns, rows, subtitle } = opts;
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "IPP Production";
  pptx.company = "IPP";
  pptx.subject = "Management Report Export";
  pptx.title = title;

  const generatedAt = format(new Date(), "yyyy-MM-dd HH:mm");
  const maxRowsPerSlide = 18;
  const chunks = chunkRows(rows, maxRowsPerSlide);

  for (const [index, chunk] of chunks.entries()) {
    const slide = pptx.addSlide();
    const pageLabel = chunks.length > 1 ? ` (Page ${index + 1}/${chunks.length})` : "";

    slide.addText(`${title}${pageLabel}`, {
      x: 0.5,
      y: 0.3,
      w: 12.3,
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: "1E3A5F",
    });
    slide.addText(subtitle ?? "-", {
      x: 0.5,
      y: 0.72,
      w: 12.3,
      h: 0.28,
      fontSize: 11,
      color: "64748B",
    });
    slide.addText(`Generated: ${generatedAt}`, {
      x: 0.5,
      y: 1.0,
      w: 12.3,
      h: 0.25,
      fontSize: 9,
      color: "94A3B8",
    });

    const tableRows = [
      columns.map((column) => ({ text: sanitizeCell(column.label) })),
      ...chunk.map((row) =>
        columns.map((column) => {
          const raw =
            column.format?.(row) ?? (row as Record<string, unknown>)[String(column.key)] ?? "";
          return { text: sanitizeCell(raw) };
        }),
      ),
    ];

    slide.addTable(tableRows, {
      x: 0.5,
      y: 1.35,
      w: 12.3,
      h: 5.6,
      border: { pt: 1, color: "CBD5E1" },
      color: "0F172A",
      fontSize: 10,
      margin: 0.06,
      fill: { color: "FFFFFF" },
      valign: "middle",
      rowH: 0.28,
    });
  }

  await pptx.writeFile({ fileName: `${filename}.pptx` });
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  if (size <= 0) return [rows];
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function sanitizeCell(value: unknown): string {
  const withoutTags = String(value).replaceAll(/<[^>]*>/g, "");
  return escapeHtml(withoutTags).replaceAll("&nbsp;", " ");
}
