import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.memo(({ className, type, ...props }: React.ComponentProps<'input'>) => (
  <input
    type={type}
    data-slot="input"
    className={cn(
      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none',
      'selection:bg-primary/20',
      'file:inline-flex file:h-9 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
      'placeholder:text-muted-foreground',
      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'dark:text-foreground',
      className,
    )}
    {...props}
  />
))

export { Input }