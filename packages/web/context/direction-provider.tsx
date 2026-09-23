'use client'

import * as React from 'react'
import { DirectionProvider as RadixDirectionProvider } from '@/components/ui/direction'

export type Dir = 'ltr' | 'rtl'

const defaultDir: Dir = 'ltr'

type DirectionContextType = {
  dir: Dir
  defaultDir: Dir
  setDir: (value: string) => void
  resetDir: () => void
}

const DirectionContext = React.createContext<DirectionContextType | undefined>(undefined)

export function DirectionProvider({
  dir: initialDir = defaultDir,
  children,
}: {
  dir?: Dir
  children: React.ReactNode
}) {
  const [dir, setDirState] = React.useState<Dir>(initialDir)

  React.useEffect(() => {
    document.documentElement.setAttribute('dir', dir)
  }, [dir])

  const setDir = React.useCallback((value: string) => setDirState(value as Dir), [])
  const resetDir = React.useCallback(() => setDirState(defaultDir), [])

  const value = React.useMemo(
    () => ({ dir, defaultDir, setDir, resetDir }),
    [dir, setDir, resetDir],
  )

  return (
    <DirectionContext.Provider value={value}>
      <RadixDirectionProvider dir={dir}>{children}</RadixDirectionProvider>
    </DirectionContext.Provider>
  )
}

export function useDirection() {
  const context = React.useContext(DirectionContext)
  if (!context) throw new Error('useDirection must be used within DirectionProvider')
  return context
}
