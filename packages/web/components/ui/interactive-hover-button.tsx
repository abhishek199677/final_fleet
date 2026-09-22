"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  className?: string;
}

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Fleet OS", className, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "group relative cursor-pointer overflow-hidden whitespace-nowrap rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-6 py-3 text-sm font-medium transition-all duration-300 hover:border-neutral-900 dark:hover:border-neutral-100",
        className
      )}
      {...props}
    >
      <span className="absolute inset-0 z-0 h-full w-full -translate-x-full rounded-[inherit] bg-neutral-900 dark:bg-neutral-100 transition-transform duration-300 ease-in-out group-hover:translate-x-0" />
      <svg
        className="absolute right-4 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-neutral-900 dark:text-neutral-100 group-hover:text-white dark:group-hover:text-black"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
      <span className="relative z-10 text-neutral-900 dark:text-neutral-100 transition-colors duration-300 group-hover:text-white dark:group-hover:text-black">
        {children || text}
      </span>
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
