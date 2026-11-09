import React from "react";

interface InfoTooltipProps {
  text: string;
  className?: string;
}

/**
 * Minimal hover/focus info icon that reveals explanatory helper text in a floating tooltip.
 */
export function InfoTooltip({ text, className = "" }: InfoTooltipProps) {
  return (
    <span className={`group relative inline-flex items-center align-middle ${className}`}>
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-stone-300 bg-stone-100 text-[10px] font-semibold text-stone-500 transition-colors hover:border-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-lg bg-stone-900 px-3 py-2 text-left text-xs font-normal leading-relaxed text-stone-100 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {text}
        <span className="absolute top-full left-1/2 -mt-1 -translate-x-1/2 border-4 border-transparent border-t-stone-900" />
      </span>
    </span>
  );
}

