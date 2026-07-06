"use client";

import React, { useState } from "react";

type Theme = "dark" | "windows98" | "pastel" | "deepsea" | "daylight" | "test";

interface Props {
  children: React.ReactNode;
}

export default function ThemeManager({ children }: Props) {
  const [theme] = useState<Theme>("dark");

  return <div className={` bg-background text-foreground`}>{children}</div>;
}
