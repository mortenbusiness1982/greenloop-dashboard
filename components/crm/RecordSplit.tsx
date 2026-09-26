"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { createPortal } from "react-dom";

const PaneTarget = createContext<HTMLDivElement | null>(null);

export function RecordSplit({ selected, children }: { selected: boolean; children: ReactNode }) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  return <PaneTarget.Provider value={target}>
    <div className="crm-record-split" data-selected={selected || undefined}>
      <div data-record-list className="crm-record-list">{children}</div>
      <div ref={setTarget} className="crm-record-detail" hidden={!selected} />
    </div>
  </PaneTarget.Provider>;
}

export function RecordPaneContent({ children }: { children: ReactNode }) {
  const target = useContext(PaneTarget);
  return target ? createPortal(children, target) : <>{children}</>;
}
