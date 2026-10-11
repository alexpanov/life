import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}
// shadcn/ui composition pattern: owned source, Radix Slot, CVA and Tailwind.
const variants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm border px-4 py-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--paint-signal)] disabled:opacity-40 disabled:pointer-events-none min-h-11",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--paint-action)] text-[var(--paint-background)] border-[var(--paint-action)] hover:brightness-110",
        secondary:
          "bg-[var(--paint-raised)] text-[var(--paint-text)] border-[var(--paint-border)] hover:brightness-125",
        ghost:
          "bg-transparent text-[var(--paint-muted)] border-transparent hover:bg-[var(--paint-raised)] hover:text-[var(--paint-text)]",
        danger:
          "bg-[var(--paint-danger-surface)] text-[var(--paint-danger)] border-[var(--paint-danger)] hover:brightness-125",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variants> {
  asChild?: boolean;
}
export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component className={cn(variants({ variant }), className)} {...props} />
  );
}
