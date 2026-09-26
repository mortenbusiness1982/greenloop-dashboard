"use client";

import { Children, createContext, HTMLAttributes, isValidElement, ReactNode, useContext } from "react";
import { createPortal } from "react-dom";

export const WorkspaceHeaderTarget = createContext<HTMLDivElement | null>(null);

function containsTitle(node: ReactNode): boolean {
  if (!isValidElement<{ children?: ReactNode }>(node)) return false;
  return node.type === "h1" || Children.toArray(node.props.children).some(containsTitle);
}

/** Keep page-owned actions and their state in the page, rendered in the shared bar. */
export function WorkspaceHeader({ children, className = "", ...props }: HTMLAttributes<HTMLElement>) {
  const target = useContext(WorkspaceHeaderTarget);
  const nodes = Children.toArray(children).filter((node) => typeof node !== "string" || node.trim());
  const titles = nodes.filter(containsTitle);
  const actions = nodes.filter((node) => !containsTitle(node));
  const header = <div {...props} className={`crm-page-heading ${className}`}>
    <div className="crm-heading-title">{titles}</div>
    {actions.length ? <div className="crm-heading-actions">{actions}</div> : null}
  </div>;
  return target ? createPortal(header, target) : header;
}
