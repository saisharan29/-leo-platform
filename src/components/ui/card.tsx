import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-card rounded-card border border-craie shadow-card ${className}`}
      {...props}
    />
  );
}
