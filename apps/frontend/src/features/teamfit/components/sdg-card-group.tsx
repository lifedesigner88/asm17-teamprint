import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button, Field } from "@/common/components";
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
  selectionCount?: number;
  disabled?: boolean;
};

function SdgPreviewCard({
  item,
  placeholderLabel,
  scale = "compact"
}: {
  item?: SdgCardItem;
  placeholderLabel: string;
  scale?: "compact" | "preview";
}) {
  const sizeClass = scale === "preview" ? "w-[88%] sm:w-[90%]" : "w-[80%] sm:w-[82%]";
  const placeholderTextClass =
    scale === "preview" ? "text-xs font-medium leading-5 text-slate-400" : "text-sm font-medium leading-5 text-slate-500";
  const badgeTextClass =
    scale === "preview"
      ? "text-[8px] font-semibold"
      : "text-[10px] font-semibold sm:text-[11px]";

  if (!item) {
    return (
      <div
        className={cn(
          "mx-auto flex aspect-square items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50/90 p-2 text-center",
          sizeClass
        )}
      >
        <span className={placeholderTextClass}>{placeholderLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative mx-auto aspect-square overflow-hidden rounded-[20px] border border-transparent p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.12)]",
        sizeClass
      )}
      style={{ backgroundColor: item.color }}
    >
      <div className="absolute right-1.5 top-1.5 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[9px] font-bold text-slate-900 shadow-sm">
        ON
      </div>
      <div className="relative z-0 flex h-full w-full items-center justify-center rounded-[14px] bg-white/10 p-1">
        <img
          src={item.logoSrc}
          alt={item.label}
          loading="lazy"
          className="h-full w-full rounded-[11px] object-cover"
        />
      </div>
      <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 z-20">
        <Badge
          className={cn(
            "block w-full overflow-hidden text-ellipsis whitespace-nowrap border-white/80 bg-white/90 px-1.5 text-slate-900 shadow-sm",
            badgeTextClass
          )}
          variant="outline"
        >
          {item.label}
        </Badge>
      </div>
    </div>
  );
}

export function SdgCardGroup({
  label,
  hint,
  items,
  value,
  onChange,
  selectionCount = 4,
  disabled = false
}: SdgCardGroupProps) {
  const { t } = useTranslation("common");
  const selectedValues = value ?? [];
  const [open, setOpen] = useState(false);
  const [draftValues, setDraftValues] = useState<string[]>(selectedValues);

  useEffect(() => {
    if (!open) {
      setDraftValues(selectedValues);
    }
  }, [open, selectedValues]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const itemByValue = new Map(items.map((item) => [item.value, item]));
  const selectedItems = selectedValues
    .map((selectedValue) => itemByValue.get(selectedValue))
    .filter((item): item is SdgCardItem => Boolean(item));
  const draftItems = draftValues
    .map((selectedValue) => itemByValue.get(selectedValue))
    .filter((item): item is SdgCardItem => Boolean(item));
  const draftLimitReached = draftValues.length >= selectionCount;

  function toggleDraftValue(nextValue: string) {
    setDraftValues((current) => {
      const exists = current.includes(nextValue);
      if (exists) {
        return current.filter((valueItem) => valueItem !== nextValue);
      }
      if (current.length >= selectionCount) {
        return current;
      }
      return [...current, nextValue];
    });
  }

  const dialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              aria-label={t("teamfit.sdgDialog.close")}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="teamfit-sdg-dialog-title"
              className="relative z-10 w-full max-w-5xl"
            >
              <div className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[32px] border border-white/85 bg-white shadow-[0_28px_90px_-28px_rgba(15,23,42,0.45)] sm:max-h-[calc(100vh-3rem)]">
                <div className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h3
                        id="teamfit-sdg-dialog-title"
                        className="text-xl font-semibold tracking-[-0.03em] text-slate-950"
                      >
                        {t("teamfit.sdgDialog.title")}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        {t("teamfit.sdgDialog.close")}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          onChange(draftValues);
                          setOpen(false);
                        }}
                        disabled={draftValues.length !== selectionCount}
                        className="bg-slate-950 text-white hover:bg-slate-800"
                      >
                        {t("teamfit.sdgDialog.confirm")}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                  <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {t("teamfit.sdgDialog.selectedLabel")}
                          </div>
                        </div>
                        <Badge className="border-slate-200 bg-white text-slate-700" variant="outline">
                          {t("teamfit.fields.sdgTagsCount", {
                            count: draftValues.length,
                            max: selectionCount
                          })}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: selectionCount }).map((_, index) => (
                          <SdgPreviewCard
                            key={draftItems[index]?.value ?? `placeholder-${index}`}
                            item={draftItems[index]}
                            placeholderLabel={t("teamfit.sdgDialog.emptySlot", { index: index + 1 })}
                            scale="compact"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                      {items.map((item) => {
                        const isSelected = draftValues.includes(item.value);
                        const isDisabled = !isSelected && draftLimitReached;

                        return (
                          <button
                            key={item.value}
                            type="button"
                            aria-pressed={isSelected}
                            aria-label={item.label}
                            title={item.label}
                            disabled={isDisabled}
                            onClick={() => toggleDraftValue(item.value)}
                            className={cn(
                              "group relative mx-auto aspect-square w-[80%] overflow-hidden rounded-[20px] border p-1.5 text-left transition-all sm:w-[82%]",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60",
                              isSelected
                                ? "border-transparent shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
                                : "border-border/60 shadow-[0_4px_12px_rgba(15,23,42,0.06)]",
                              isDisabled && "cursor-not-allowed opacity-45 grayscale-[0.15]",
                              !isDisabled && "hover:-translate-y-0.5 hover:shadow-[0_12px_20px_rgba(15,23,42,0.1)]"
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
                                <span className="absolute right-1.5 top-1.5 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[9px] font-bold text-slate-900 shadow-sm">
                                  ON
                                </span>
                              ) : null}

                              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white/8 p-1">
                                <img
                                  src={item.logoSrc}
                                  alt={item.label}
                                  loading="lazy"
                                  className="h-full w-full rounded-[11px] object-cover"
                                />
                              </div>
                            </div>
                            <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 z-20">
                              <Badge
                                className="block w-full overflow-hidden text-ellipsis whitespace-nowrap border-white/80 bg-white/88 px-1.5 text-[9px] font-semibold text-slate-900 shadow-sm sm:text-[10px]"
                                variant="outline"
                              >
                                {item.label}
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Field label={label} hint={hint}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setDraftValues(selectedValues);
            setOpen(true);
          }}
          className={cn(
            "block w-full rounded-[28px] border border-slate-200 bg-white p-4 text-left shadow-sm transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60",
            disabled
              ? "cursor-not-allowed opacity-70"
              : "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_22px_rgba(15,23,42,0.08)]"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge className="border-slate-200 bg-slate-50 text-slate-700" variant="outline">
              {t("teamfit.fields.sdgTagsCount", {
                count: selectedValues.length,
                max: selectionCount
              })}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: selectionCount }).map((_, index) => (
              <SdgPreviewCard
                key={selectedItems[index]?.value ?? `preview-placeholder-${index}`}
                item={selectedItems[index]}
                placeholderLabel={t("teamfit.sdgDialog.emptySlot", { index: index + 1 })}
                scale="preview"
              />
            ))}
          </div>
        </button>
      </Field>

      {dialog}
    </>
  );
}
