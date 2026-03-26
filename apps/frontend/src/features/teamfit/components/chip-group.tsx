import type { ReactNode } from "react";

import { Button, Field } from "@/common/components";
import { cn } from "@/lib/utils";

type ChoiceItem = {
  value: string;
  label: string;
};

type ChipGroupProps = {
  label: ReactNode;
  hint?: string;
  items: ChoiceItem[];
  mode: "multi" | "single";
  value: string[] | string;
  onChange: (value: string[] | string) => void;
  required?: boolean;
  disabled?: boolean;
};

export function ChipGroup({
  label,
  hint,
  items,
  mode,
  value,
  onChange,
  required,
  disabled
}: ChipGroupProps) {
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isSelected = selectedValues.includes(item.value);

          return (
            <Button
              key={item.value}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "h-auto rounded-full px-3 py-2 text-xs font-medium tracking-normal",
                isSelected && "shadow-sm"
              )}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-required={required}
              onClick={() => {
                if (mode === "single") {
                  onChange(item.value);
                  return;
                }

                const next = isSelected
                  ? selectedValues.filter((selected) => selected !== item.value)
                  : [...selectedValues, item.value];
                onChange(next);
              }}
            >
              {item.label}
            </Button>
          );
        })}
      </div>
    </Field>
  );
}
