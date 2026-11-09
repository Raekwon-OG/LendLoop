import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "available" | "borrowed" | "neutral" | "accent" | "danger";
}

export function Badge({ className = "", variant = "neutral", children, ...props }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide";

  const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
    available: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    borrowed: "bg-amber-100 text-amber-800 border border-amber-200",
    neutral: "bg-stone-100 text-stone-700 border border-stone-200",
    accent: "bg-stone-800 text-white border border-stone-900",
    danger: "bg-red-100 text-red-800 border border-red-200",
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
