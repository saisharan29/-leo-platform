import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "soft" | "ghost" | "danger";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-body font-extrabold rounded-input select-none disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "chunky chunky-bleu bg-bleu text-white",
  soft: "chunky bg-craie/70 text-ink",
  ghost: "press bg-transparent text-bleu hover:bg-bleu/10 transition-colors",
  danger: "chunky bg-groseille text-white",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-base", // ≥44px touch target
  lg: "h-12 px-6 text-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = "Button";
