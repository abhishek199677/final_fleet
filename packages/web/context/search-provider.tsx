'use client'

import * as React from 'react'

type SearchContextType = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const SearchContext = React.createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return <SearchContext.Provider value={{ open, setOpen }}>{children}</SearchContext.Provider>
}

export function useSearch() {
  const context = React.useContext(SearchContext)
  if (!context) throw new Error('useSearch must be used within SearchProvider')
  return context
}
