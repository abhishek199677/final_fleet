'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import LoadingBar, { type LoadingBarRef } from 'react-top-loading-bar'

export function NavigationProgress() {
  const ref = useRef<LoadingBarRef>(null)
  const pathname = usePathname()

  useEffect(() => {
    ref.current?.continuousStart()
    const timer = setTimeout(() => ref.current?.complete(), 500)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <LoadingBar
      color='hsl(var(--muted-foreground))'
      ref={ref}
      shadow={true}
      height={2}
    />
  )
}
