"use client";

import { MoreHorizontal } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";

export function ActionMenu({ label, children }: { label: string; children: ReactNode }) {
  const root = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (root.current?.open && !root.current.contains(event.target as Node)) root.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return <details ref={root} className="crm-action-menu" onKeyDown={event => {
    if (event.key === "Escape") { event.stopPropagation(); if (root.current) root.current.open = false; root.current?.querySelector("summary")?.focus(); }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (root.current) root.current.open = true;
      const commands = Array.from(root.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled), a[href]") || []);
      const current = commands.indexOf(document.activeElement as HTMLButtonElement);
      commands[(current + (event.key === "ArrowDown" ? 1 : -1) + commands.length) % commands.length]?.focus();
    }
  }}>
    <summary aria-label={label} title={label}><MoreHorizontal size={18} /></summary>
    <div role="group" aria-label={label}>{children}</div>
  </details>;
}
