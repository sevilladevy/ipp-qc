import { Search } from "lucide-react";
import type { ManagementFilters } from "@/lib/management";

type LaporanFilterBarProps = {
  filters: ManagementFilters;
  setFilters: React.Dispatch<React.SetStateAction<ManagementFilters>>;
  search: string;
  setSearch: (v: string) => void;
  groupBy: string;
  setGroupBy: (v: string) => void;
  presets: { id: string; name: string }[];
  presetName: string;
  setPresetName: (v: string) => void;
  onSavePreset: () => void;
  onLoadPreset: (id: string) => void;
  onRemovePreset: (id: string) => void;
  mejaOptions: number[];
  inspectorOptions: { id: string; name: string }[];
  allParts: string[];
  onTemplate: (t: "daily" | "weekly" | "monthly" | "meja" | "part" | "defect") => void;
};

export function LaporanFilterBar({
  filters,
  setFilters,
  search,
  setSearch,
  groupBy,
  setGroupBy,
  presets,
  presetName,
  setPresetName,
  onSavePreset,
  onLoadPreset,
  onRemovePreset,
  mejaOptions,
  inspectorOptions,
  allParts,
  onTemplate,
}: LaporanFilterBarProps) {
  return (
    <div className="grid w-full gap-3">
      <div className="flex flex-wrap gap-2">
        <button className="tag" onClick={() => onTemplate("daily")}>
          Daily
        </button>
        <button className="tag" onClick={() => onTemplate("weekly")}>
          Weekly
        </button>
        <button className="tag" onClick={() => onTemplate("monthly")}>
          Monthly
        </button>
        <button className="tag" onClick={() => onTemplate("meja")}>
          Meja Inspeksi
        </button>
        <button className="tag" onClick={() => onTemplate("part")}>
          Part
        </button>
        <button className="tag" onClick={() => onTemplate("defect")}>
          Defect Focus
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
        <input
          type="date"
          value={filters.from}
          max={filters.to}
          aria-label="Tanggal mulai"
          onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
          className="ipt2"
        />
        <input
          type="date"
          value={filters.to}
          min={filters.from}
          aria-label="Tanggal selesai"
          onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
          className="ipt2"
        />
        <select
          aria-label="Filter meja"
          value={filters.meja}
          onChange={(e) =>
            setFilters((p) => ({ ...p, meja: e.target.value ? Number(e.target.value) : "" }))
          }
          className="ipt2"
        >
          <option value="">Semua meja</option>
          {mejaOptions.map((m) => (
            <option key={m} value={m}>
              Meja {m}
            </option>
          ))}
        </select>
        <select
          value={filters.shift}
          aria-label="Filter shift"
          onChange={(e) => setFilters((p) => ({ ...p, shift: e.target.value }))}
          className="ipt2"
        >
          <option value="">Semua shift</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
        <input
          value={filters.part}
          onChange={(e) => setFilters((p) => ({ ...p, part: e.target.value }))}
          placeholder="Part"
          aria-label="Filter part"
          list="laporan-part-options"
          className="ipt2"
        />
        <datalist id="laporan-part-options">
          {[...new Set(allParts)].map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <select
          aria-label="Filter inspector"
          value={filters.inspectorId}
          onChange={(e) => setFilters((p) => ({ ...p, inspectorId: e.target.value }))}
          className="ipt2"
        >
          <option value="">Semua inspector</option>
          {inspectorOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          placeholder="Min pass rate %"
          aria-label="Filter minimum pass rate persen"
          value={filters.minYield != null ? Math.round(filters.minYield * 100) : ""}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              minYield: e.target.value ? Number(e.target.value) / 100 : undefined,
            }))
          }
          className="ipt2"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex h-10 items-center gap-2 rounded border border-input px-2 text-xs">
          <input
            type="checkbox"
            checked={!!filters.onlyInvalid}
            onChange={(e) => setFilters((p) => ({ ...p, onlyInvalid: e.target.checked }))}
          />
          Hanya invalid
        </label>
        <label className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search part/inspector/meja..."
            aria-label="Cari laporan"
            className="ipt2 pl-8 w-full"
          />
        </label>
        <select
          value={groupBy}
          aria-label="Kelompokkan laporan"
          onChange={(e) => setGroupBy(e.target.value)}
          className="ipt2"
        >
          <option value="none">Tanpa grouping</option>
          <option value="report_date">Group by tanggal</option>
          <option value="shift">Group by shift</option>
          <option value="no_meja">Group by meja</option>
          <option value="part_name">Group by part</option>
        </select>
        <div className="flex gap-2">
          <input
            className="ipt2"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Nama preset"
            aria-label="Nama preset baru"
          />
          <button className="btn2" onClick={onSavePreset}>
            Save
          </button>
        </div>
      </div>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <div key={preset.id} className="preset-chip">
              <button className="preset-chip-name" onClick={() => onLoadPreset(preset.id)}>
                {preset.name}
              </button>
              <button
                className="preset-chip-remove"
                onClick={() => onRemovePreset(preset.id)}
                aria-label={`Hapus preset ${preset.name}`}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
