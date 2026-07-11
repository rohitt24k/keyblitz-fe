import { cn } from "@/lib/utils";
import React from "react";

interface TypographyProps {
  className?: string;
  children: React.ReactNode;
}

export function H1({ className, children }: TypographyProps) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function H2({ className, children }: TypographyProps) {
  return (
    <h2
      className={cn(
        "border-border scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function H3({ className, children }: TypographyProps) {
  return (
    <h3
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function H4({ className, children }: TypographyProps) {
  return (
    <h4
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h4>
  );
}

export function Lead({ className, children }: TypographyProps) {
  return (
    <p className={cn("text-muted-foreground text-xl", className)}>{children}</p>
  );
}

export function Large({ className, children }: TypographyProps) {
  return (
    <div className={cn("text-lg font-semibold", className)}>{children}</div>
  );
}

export function P({ className, children }: TypographyProps) {
  return (
    <p className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}>
      {children}
    </p>
  );
}

export function Muted({ className, children }: TypographyProps) {
  return (
    <p className={cn("text-muted-foreground text-sm", className)}>{children}</p>
  );
}

export function Small({ className, children }: TypographyProps) {
  return (
    <small className={cn("text-sm leading-none font-medium", className)}>
      {children}
    </small>
  );
}

export function InlineCode({ className, children }: TypographyProps) {
  return (
    <code
      className={cn(
        "bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
        className,
      )}
    >
      {children}
    </code>
  );
}
