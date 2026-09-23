import * as React from "react"
import { cn } from "@/lib/utils"

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body-lg" | "body-md" | "body-sm" | "body-xs"
  className?: string
}

export function Typography({
  variant = "body-md",
  className,
  ...props
}: TypographyProps) {
  const variants: Record<string, string> = {
    h1: "text-4xl font-bold tracking-tight",
    h2: "text-3xl font-bold tracking-tight",
    h3: "text-2xl font-bold tracking-tight",
    h4: "text-xl font-bold tracking-tight",
    h5: "text-lg font-bold tracking-tight",
    h6: "text-base font-bold tracking-tight",
    "body-lg": "text-lg leading-relaxed",
    "body-md": "text-base leading-relaxed",
    "body-sm": "text-sm leading-relaxed",
    "body-xs": "text-xs leading-relaxed",
  }

  return (
    <span
      className={cn(variants[variant], className)}
      {...props}
    />
  )
}