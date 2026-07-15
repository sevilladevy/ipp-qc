import { format, startOfMonth, subDays } from "date-fns";
import { cn } from "@/lib/utils";

export type PeriodMode = "daily" | "weekly" | "monthly" | "range";

type PeriodFilterProps = {
  from: string;
  to: string;
  mode: PeriodMode;
  onChange: (next: { from: string; to: string; mode: PeriodMode }) => void;
  className?: string;
  inputClassName?: string;
  testIdPrefix?: string;
};

const PERIOD_OPTIONS: { label: string; mode: PeriodMode }[] = [
  { label: "Daily", mode: "daily" },
  { label: "Weekly", mode: "weekly" },
  { label: "Monthly", mode: "monthly" },
  { label: "Range", mode: "range" },
];

export function getPeriodRange(mode: PeriodMode, now = new Date()) {
  const today = format(now, "yyyy-MM-dd");
  if (mode === "daily") return { from: today, to: today };
  if (mode === "weekly") return { from: format(subDays(now, 6), "yyyy-MM-dd"), to: today };
  if (mode === "monthly") {
    return {
      from: format(startOfMonth(now), "yyyy-MM-dd"),
      to: today,
    };
  }
  return { from: today, to: today };
}

export function PeriodFilter({
  from,
  to,
  mode,
  onChange,
  className,
  inputClassName = "ipt",
  testIdPrefix = "period",
}: PeriodFilterProps) {
  return (
    <div
      className={cn("grid gap-2 md:grid-cols-[auto_1fr]", className)}
      data-testid={`${testIdPrefix}-root`}
    >
      <div className="inline-flex overflow-hidden rounded-lg border border-border bg-muted/30 p-1">
        {PERIOD_OPTIONS.map((option) => {
          const active = mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              className={cn(
                "rounded-md px-3 py-2 text-xs font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
              data-testid={`${testIdPrefix}-mode-${option.mode}`}
              onClick={() => {
                if (option.mode === "range") {
                  onChange({ from, to, mode: "range" });
                  return;
                }
                onChange({ ...getPeriodRange(option.mode), mode: option.mode });
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="date"
          className={inputClassName}
          data-testid={`${testIdPrefix}-from`}
          value={from}
          max={to}
          onChange={(event) => {
            const nextFrom = event.target.value;
            if (!nextFrom) return;
            onChange({ from: nextFrom, to, mode: "range" });
          }}
        />
        <input
          type="date"
          className={inputClassName}
          data-testid={`${testIdPrefix}-to`}
          value={to}
          min={from}
          onChange={(event) => {
            const nextTo = event.target.value;
            if (!nextTo) return;
            onChange({ from, to: nextTo, mode: "range" });
          }}
        />
      </div>
    </div>
  );
}
