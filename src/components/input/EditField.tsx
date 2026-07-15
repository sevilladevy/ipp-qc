import type { ReactNode } from "react";

export function EditField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
