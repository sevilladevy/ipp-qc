import {
  DataTablePagination,
  DataTableShell,
  DataTableState,
  SortableHeader,
} from "@/components/data-table";
import { EmptyState, Skeleton } from "@/components/ui-kit";
import { fmtNum, fmtPct } from "@/lib/format";
import type { AggregatedReportRow, EnrichedReport } from "@/lib/management";
import type { SortKey, SortDir } from "@/routes/laporan";
import { LaporanRow } from "./LaporanRow";

type LaporanTableProps = {
  isGrouped: boolean;
  totalRows: number;
  totalPages: number;
  page: number;
  pageSize: number;
  sortKey: SortKey;
  sortDir: SortDir;
  pageGroupedRows: AggregatedReportRow[];
  pageDetailRows: EnrichedReport[];
  expanded: Record<string, boolean>;
  canDelete: boolean;
  deletingId: string | null;
  user: { id: string } | null;
  queryLoading: boolean;
  queryError: unknown;
  onRefetch: () => void;
  onSort: (key: SortKey) => void;
  onToggleExpand: (id: string) => void;
  onDelete: (row: EnrichedReport) => void;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onNavigateNC: (row: EnrichedReport) => void;
};

export function LaporanTable({
  isGrouped,
  totalRows,
  totalPages,
  page,
  pageSize,
  sortKey,
  sortDir,
  pageGroupedRows,
  pageDetailRows,
  expanded,
  canDelete,
  deletingId,
  user,
  queryLoading,
  queryError,
  onRefetch,
  onSort,
  onToggleExpand,
  onDelete,
  onPageChange,
  onPageSizeChange,
  onNavigateNC,
}: LaporanTableProps) {
  return (
    <DataTableShell className="mb-4" title="Templates & Advanced Filters">
      {queryLoading ? (
        <div className="p-4">
          <Skeleton className="h-64" />
        </div>
      ) : queryError ? (
        <DataTableState
          tone="error"
          title="Gagal memuat laporan"
          description={queryError instanceof Error ? queryError.message : "Terjadi kesalahan."}
          action={
            <button type="button" onClick={onRefetch} disabled={false} className="btn2">
              Coba lagi
            </button>
          }
        />
      ) : !pageDetailRows.length && !pageGroupedRows.length ? (
        <div className="p-6">
          <EmptyState
            title="Tidak ada data report"
            description="Ubah filter atau template laporan."
          />
        </div>
      ) : isGrouped ? (
        <>
          <div className="overflow-x-auto">
            <table className="table-pro cardify w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Group</th>
                  <th className="px-3 py-2 text-right">Reports</th>
                  <th className="px-3 py-2 text-right">Qty Check</th>
                  <th className="px-3 py-2 text-right">OK</th>
                  <th className="px-3 py-2 text-right">NG</th>
                  <th className="px-3 py-2 text-right">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {pageGroupedRows.map((row) => (
                  <tr key={row.key}>
                    <td data-label="Group" className="px-3 py-2 font-medium">
                      {row.key}
                    </td>
                    <td data-label="Reports" className="px-3 py-2 text-right">
                      {fmtNum(row.reports)}
                    </td>
                    <td data-label="Qty Check" className="px-3 py-2 text-right">
                      {fmtNum(row.qty_check)}
                    </td>
                    <td data-label="OK" className="px-3 py-2 text-right text-success">
                      {fmtNum(row.ok)}
                    </td>
                    <td data-label="NG" className="px-3 py-2 text-right text-destructive">
                      {fmtNum(row.ng)}
                    </td>
                    <td data-label="Pass Rate" className="px-3 py-2 text-right">
                      {fmtPct(row.passRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataTablePagination
            page={page}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            onPageChange={onPageChange}
          />
        </>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table-pro cardify w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left">No</th>
                  <th className="px-3 py-3 text-left">
                    <SortableHeader
                      label="Tanggal"
                      active={sortKey === "report_date"}
                      direction={sortDir}
                      onClick={() => onSort("report_date")}
                    />
                  </th>
                  <th className="px-3 py-3 text-left">
                    <SortableHeader
                      label="Shift"
                      active={sortKey === "shift"}
                      direction={sortDir}
                      onClick={() => onSort("shift")}
                    />
                  </th>
                  <th className="px-3 py-3 text-left">
                    <SortableHeader
                      label="Meja"
                      active={sortKey === "no_meja"}
                      direction={sortDir}
                      onClick={() => onSort("no_meja")}
                    />
                  </th>
                  <th className="px-3 py-3 text-left">
                    <SortableHeader
                      label="Part"
                      active={sortKey === "part_name"}
                      direction={sortDir}
                      onClick={() => onSort("part_name")}
                    />
                  </th>
                  <th className="px-3 py-3 text-right">
                    <SortableHeader
                      label="Qty Check"
                      active={sortKey === "qty_check"}
                      direction={sortDir}
                      onClick={() => onSort("qty_check")}
                      align="right"
                    />
                  </th>
                  <th className="px-3 py-3 text-right">OK</th>
                  <th className="px-3 py-3 text-right">NG</th>
                  <th className="px-3 py-3 text-left">Validation</th>
                  <th className="px-3 py-3 text-left">Inspector</th>
                  <th className="px-3 py-3 text-center">Expand</th>
                  {canDelete && <th className="px-3 py-3 text-center">Delete</th>}
                </tr>
              </thead>
              <tbody>
                {pageDetailRows.map((row, index) => (
                  <LaporanRow
                    key={row.id}
                    row={row}
                    index={index}
                    page={page}
                    pageSize={pageSize}
                    expanded={!!expanded[row.id]}
                    canDelete={canDelete}
                    deletingId={deletingId}
                    user={user}
                    onToggleExpand={() => onToggleExpand(row.id)}
                    onDelete={() => onDelete(row)}
                    onNavigateNC={() => onNavigateNC(row)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <DataTablePagination
            page={page}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            onPageChange={onPageChange}
          />
        </>
      )}
    </DataTableShell>
  );
}
