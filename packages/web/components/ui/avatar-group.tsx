import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"

const AvatarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /**
     * The maximum number of avatars to show before collapsing the rest into a "+x" indicator.
     * @defaultValue 4
     */
    max?: number
    /**
     * Whether to show the "+x" indicator when there are more avatars than `max`.
     * @defaultValue true
     */
    popover?: boolean
  }
>(({ className, max = 4, popover = true, children, ...props }, ref) => {
  const childrenArray = Array.isArray(children) ? children : [children]

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center space-x-[calc(-1*_var(--avatar-ring-width))]",
        className
      )}
      {...props}
    >
      {childrenArray.slice(0, max)}
      {popover && childrenArray.length > max && (
        <AvatarPrimitive.Root
          className={cn(
            "flex h-[var(--avatar-size)] w-[var(--avatar-size)] items-center justify-center rounded-full border bg-muted px-[calc(var(--avatar-size)*0.4)] text-muted-foreground",
            "var(--avatar-ring-width)"
          )}
        >
          +{childrenArray.length - max}
        </AvatarPrimitive.Root>
      )}
    </div>
  )
})
AvatarGroup.displayName = "AvatarGroup"

export { AvatarGroup }