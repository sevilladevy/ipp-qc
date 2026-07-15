import { format } from "date-fns";
import pptxgen from "pptxgenjs";
import type { ExportColumn } from "./table-export";

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
