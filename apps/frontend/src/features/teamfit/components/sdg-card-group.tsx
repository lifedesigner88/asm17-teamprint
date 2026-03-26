import type { ReactNode } from "react";

import { Badge, Field } from "@/common/components";
import { cn } from "@/lib/utils";

type SdgCardItem = {
  value: string;
  label: string;
  goal: string;
  color: string;
  logoSrc: string;
};

type SdgCardGroupProps = {
  label: ReactNode;
  hint?: string;
  items: SdgCardItem[];
  value: string[];
  onChange: (value: string[]) => void;
  maxSelections?: number;
  disabled?: boolean;
};

export function SdgCardGroup({
  label,
  hint,
  items,
  value,
  onChange,
  maxSelections = 4,
  disabled = false
}: SdgCardGroupProps) {
  const selectedValues = value ?? [];
  const limitReached = selectedValues.length >= maxSelections;

  return (
    <Field label={label} hint={hint}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item) => {
          const isSelected = selectedValues.includes(item.value);
          const isDisabled = disabled || (!isSelected && limitReached);

          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={isSelected}
              aria-label={item.label}
              title={item.label}
              disabled={isDisabled}
              onClick={() => {
                if (isSelected) {
                  onChange(selectedValues.filter((selected) => selected !== item.value));
                  return;
                }

                if (limitReached) {
                  return;
                }

                onChange([...selectedValues, item.value]);
              }}
              className={cn(
                "group relative mx-auto my-[10%] aspect-square w-[80%] overflow-hidden rounded-[18px] border p-1.5 text-left transition-all sm:p-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60",
                isSelected
                  ? "border-transparent shadow-[0_10px_20px_rgba(15,23,42,0.14)]"
                  : "border-border/50 shadow-[0_4px_12px_rgba(15,23,42,0.04)]",
                isDisabled && "cursor-not-allowed opacity-45 grayscale-[0.15]",
                !isDisabled && "hover:-translate-y-0.5 hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)]"
              )}
              style={{ backgroundColor: item.color }}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 z-10 transition-colors duration-200",
                  isSelected ? "bg-transparent" : "bg-white/48"
                )}
              />

              <div className="relative z-0 flex h-full items-start justify-end">
                {isSelected ? (
                  <span className="absolute right-1.5 top-1.5 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-900 shadow-sm sm:h-7 sm:w-7">
                    ON
                  </span>
                ) : null}

                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white/8 p-1 sm:rounded-[16px] sm:p-1.5">
                  <img
                    src={item.logoSrc}
                    alt={item.label}
                    loading="lazy"
                    className={cn(
                      "h-full w-full rounded-[10px] object-cover transition-all duration-200 sm:rounded-[12px]",
                      isSelected ? "opacity-100" : "opacity-90"
                    )}
                  />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 z-20 sm:inset-x-2 sm:bottom-2">
                <Badge
                  className="block w-full overflow-hidden text-ellipsis whitespace-nowrap border-white/80 bg-white/88 text-[9px] font-semibold text-slate-900 shadow-sm sm:text-[10px]"
                  variant="outline"
                >
                  {item.label}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </Field>
  );
}
