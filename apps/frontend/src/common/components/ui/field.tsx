import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-foreground/80">
      <div className="mb-1.5 block">{label}</div>
      {children}
      {hint ? <div className="mt-1.5 text-xs font-normal text-muted-foreground">{hint}</div> : null}
    </label>
  );
}
