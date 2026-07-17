"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-extrabold text-ink">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-11 rounded-input border bg-card px-3.5 text-base text-ink placeholder:text-ink2/70 ${
            error ? "border-groseille" : "border-craie"
          } ${className}`}
          {...props}
        />
        {error ? (
          <p id={errorId} className="text-sm font-semibold text-groseille">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
