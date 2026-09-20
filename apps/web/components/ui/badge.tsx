import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
  {
    variants: {
      variant: {
        default: "border-zinc-700 bg-zinc-800 text-zinc-300",
        easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        hard: "border-rose-500/30 bg-rose-500/10 text-rose-300",
        lime: "border-lime-400/30 bg-lime-400/10 text-lime-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
