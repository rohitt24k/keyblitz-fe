import React from "react";
import Logo from "./Logo";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-8">
      <Logo />
    </header>
  );
}
