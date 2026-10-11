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
  "inline-flex items-center justify-center gap-2 rounded-sm border px-4 py-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200 disabled:opacity-40 disabled:pointer-events-none min-h-11",
  {
    variants: {
      variant: {
        default:
          "bg-lime-200/85 text-slate-950 border-lime-200 hover:bg-lime-100",
        secondary:
          "bg-slate-900 text-slate-100 border-slate-600 hover:bg-slate-800",
        ghost:
          "bg-transparent text-slate-300 border-transparent hover:bg-slate-800",
        danger: "bg-red-950 text-red-100 border-red-800 hover:bg-red-900",
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
