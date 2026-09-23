'use client'

import * as React from 'react'

/** shadcn sidebar `collapsible` options */
export type Collapsible = 'offcanvas' | 'icon' | 'none'
/** shadcn sidebar `variant` options */
export type Variant = 'sidebar' | 'floating' | 'inset'

const defaultCollapsible: Collapsible = 'offcanvas'
const defaultVariant: Variant = 'sidebar'

type LayoutContextType = {
  defaultCollapsible: Collapsible
  collapsible: Collapsible
  setCollapsible: (value: string) => void
  defaultVariant: Variant
  variant: Variant
  setVariant: (value: string) => void
  resetLayout: () => void
}

const LayoutContext = React.createContext<LayoutContextType | undefined>(undefined)

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [collapsible, setCollapsibleState] = React.useState<Collapsible>(defaultCollapsible)
  const [variant, setVariantState] = React.useState<Variant>(defaultVariant)

  const setCollapsible = React.useCallback((value: string) => {
    setCollapsibleState(value as Collapsible)
  }, [])
  const setVariant = React.useCallback((value: string) => {
    setVariantState(value as Variant)
  }, [])
  const resetLayout = React.useCallback(() => {
    setCollapsibleState(defaultCollapsible)
    setVariantState(defaultVariant)
  }, [])

  const value = React.useMemo(
    () => ({
      defaultCollapsible,
      collapsible,
      setCollapsible,
      defaultVariant,
      variant,
      setVariant,
      resetLayout,
    }),
    [collapsible, setCollapsible, variant, setVariant, resetLayout],
  )

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout() {
  const context = React.useContext(LayoutContext)
  if (!context) throw new Error('useLayout must be used within LayoutProvider')
  return context
}
