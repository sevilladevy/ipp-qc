import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export type ExportColumn<T> = {
  key: keyof T | string;
  label: string;
  format?: (row: T) => string | number | null | undefined;
};

export function exportToCsv<T>(options: {
  filename: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  const { filename, columns, rows } = options;
  const escapeCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

  const header = columns.map((column) => escapeCell(column.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((column) => {
        const raw =
          column.format?.(row) ?? (row as Record<string, unknown>)[String(column.key)] ?? "";
        return escapeCell(raw as string | number);
      })
      .join(","),
  );

  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportToPdf<T>(options: {
  filename: string;
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  const { filename, title, columns, rows } = options;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, pageWidth - 14, 14, {
    align: "right",
  });

  const head = [columns.map((column) => column.label)];
  const body = rows.map((row) =>
    columns.map((column) => {
      const raw =
        column.format?.(row) ?? (row as Record<string, unknown>)[String(column.key)] ?? "";
      return String(raw);
    }),
  );

  autoTable(doc, {
    startY: 20,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 10, right: 10, bottom: 10 },
  });

  doc.save(`${filename}.pdf`);
}
