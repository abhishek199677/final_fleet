import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

const Avatar = React.memo(({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) => (
  <AvatarPrimitive.Root
    data-slot='avatar'
    className={cn(
      'relative flex size-8 shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
))

const AvatarImage = React.memo(({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) => (
  <AvatarPrimitive.Image
    data-slot='avatar-image'
    className={cn('aspect-square size-full', className)}
    {...props}
  />
))

const AvatarFallback = React.memo(({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) => (
  <AvatarPrimitive.Fallback
    data-slot='avatar-fallback'
    className={cn(
      'flex size-full items-center justify-center rounded-full bg-muted',
      className
    )}
    {...props}
  />
))

export { Avatar, AvatarImage, AvatarFallback }
