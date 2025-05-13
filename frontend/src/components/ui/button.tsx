"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* ---------- styling ---------- */
export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium" +
    " ring-offset-background transition-colors focus-visible:outline-none" +
    " focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" +
    " disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[--accent-primary] text-white hover:bg-[--accent] active:bg-[--accent-primary]/90",
        secondary:
          "bg-white/10 text-white hover:bg-white/20 active:bg-white/30",
        ghost: "bg-transparent hover:bg-black/5 active:bg-black/10",
      },
      size: { sm: "h-8 px-3", md: "h-10 px-4", lg: "h-12 px-6 text-base" },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);

Button.displayName = "Button";
