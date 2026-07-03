import { cn } from "@/lib/utils";
import React from "react";

interface TypographyProps {
  className?: string;
  children: React.ReactNode;
}

export function H1({ className, children }: TypographyProps) {
  return (
    <h1 className={cn("text-4xl font-bold tracking-tight", className)}>
      {children}
    </h1>
  );
}

export function H2({ className, children }: TypographyProps) {
  return (
    <h2 className={cn("text-3xl font-semibold tracking-tight", className)}>
      {children}
    </h2>
  );
}

export function H3({ className, children }: TypographyProps) {
  return (
    <h3 className={cn("text-2xl font-semibold tracking-tight", className)}>
      {children}
    </h3>
  );
}

export function P({ className, children }: TypographyProps) {
  return <p className={cn("leading-7", className)}>{children}</p>;
}

export function Muted({ className, children }: TypographyProps) {
  return (
    <p className={cn("text-sm text-foreground-light", className)}>{children}</p>
  );
}

export function Small({ className, children }: TypographyProps) {
  return (
    <small className={cn("text-sm font-medium leading-none", className)}>
      {children}
    </small>
  );
}
