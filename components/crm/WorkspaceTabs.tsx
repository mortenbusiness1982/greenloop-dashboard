"use client";

import { ReactNode, useId, useState } from "react";

export function WorkspaceTabs({ label, tabs }: { label: string; tabs: { id: string; label: string; content: ReactNode }[] }) {
  const base = useId();
  const [selected, setSelected] = useState(tabs[0]?.id);
  const active = tabs.some((tab) => tab.id === selected) ? selected : tabs[0]?.id;
  return <div className="min-w-0 space-y-4">
    <div role="tablist" aria-label={label} className="flex overflow-x-auto gap-x-1 border-b border-[var(--gl-hairline)]">
      {tabs.map((tab, index) => <button key={tab.id} id={`${base}-${tab.id}-tab`} type="button" role="tab" aria-selected={active === tab.id} aria-controls={`${base}-${tab.id}-panel`} tabIndex={active === tab.id ? 0 : -1}
        onClick={() => setSelected(tab.id)}
        onKeyDown={(event) => {
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
          else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = tabs.length - 1;
          else return;
          event.preventDefault();
          setSelected(tabs[next].id);
          document.getElementById(`${base}-${tabs[next].id}-tab`)?.focus();
        }}
        className={`min-h-11 border-b-2 px-3 py-2 text-sm font-medium ${active === tab.id ? "border-[var(--gl-green)] text-[var(--gl-green-deep)]" : "border-transparent text-[var(--gl-ink-muted)] hover:text-[var(--gl-ink)]"}`}>{tab.label}</button>)}
    </div>
    {tabs.map((tab) => <div key={tab.id} id={`${base}-${tab.id}-panel`} role="tabpanel" aria-labelledby={`${base}-${tab.id}-tab`} hidden={active !== tab.id} className={active === tab.id ? "min-w-0 space-y-4" : "hidden"}>{tab.content}</div>)}
  </div>;
}
