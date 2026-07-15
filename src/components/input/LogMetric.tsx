import { cn } from "@/lib/utils";

export function LogMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-center">
      <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-lg font-bold",
          tone === "success" && "text-success",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </div>
    </div>
  );
}
