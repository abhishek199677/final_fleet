import * as React from "react"
import { Toaster as SonnerToast, type ToasterProps } from "sonner"

interface ToastProps extends ToasterProps {}

export function Toast({ ...props }: ToastProps) {
  return (
    <SonnerToast
      theme="light"
      className="toaster group [&_div[data-content]]:w-full"
      {...props}
    />
  )
}