import { type ComponentProps, type Ref, useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type TextareaProps = ComponentProps<"textarea"> & {
  autoGrow?: boolean;
  minRows?: number;
};

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    (ref as { current: T }).current = value;
  }
}

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export function Textarea({
  autoGrow = false,
  className,
  minRows,
  onInput,
  ref,
  rows,
  ...props
}: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    if (!autoGrow || !textareaRef.current) {
      return;
    }

    resizeTextarea(textareaRef.current);
  }, [autoGrow, minRows, props.value]);

  return (
    <textarea
      {...props}
      ref={(node) => {
        textareaRef.current = node;
        assignRef(ref, node as HTMLTextAreaElement);
      }}
      rows={minRows ?? rows}
      onInput={(event) => {
        if (autoGrow) {
          resizeTextarea(event.currentTarget);
        }

        onInput?.(event);
      }}
      className={cn(
        "w-full rounded-2xl border border-border/80 bg-white/80 px-3.5 py-3 text-sm outline-none transition",
        "placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:bg-white focus:ring-4 focus:ring-foreground/5",
        autoGrow && "overflow-hidden",
        className
      )}
    />
  );
}
