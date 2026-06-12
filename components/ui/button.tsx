import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-pitch)] text-white hover:bg-[var(--color-pitch-bright)] shadow-lg shadow-[var(--color-pitch)]/20",
        gold: "bg-[var(--color-gold)] text-black font-semibold hover:brightness-110",
        danger:
          "bg-red-500/90 text-white font-semibold hover:bg-red-500 shadow-lg shadow-red-500/20",
        outline:
          "border border-[var(--color-border-subtle)] bg-transparent text-[var(--color-cream)] hover:bg-[var(--color-surface-2)]",
        ghost:
          "bg-transparent text-[var(--color-cream)] hover:bg-[var(--color-surface-2)]",
        surface:
          "bg-[var(--color-surface-2)] text-[var(--color-cream)] hover:brightness-125",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-13 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
