"use client";

import { useState } from "react";

export default function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block ml-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        ⓘ
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-64 rounded-lg bg-gray-900 p-3 text-xs text-white shadow-lg">
          {text}
        </div>
      )}
    </span>
  );
}