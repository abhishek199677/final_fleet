'use client'

import * as React from 'react'

/**
 * Theme provider built on Fleet OS's existing dark-mode mechanism
 * (the `fleetos_dark` localStorage key + `.dark` class on <html>, seeded
 * by the inline script in app/layout.tsx). This keeps a single source of
 * truth so the sidebar toggle, ThemeSwitch, CommandMenu and ConfigDrawer
 * all stay in sync.
 */

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'fleetos_dark'
const defaultTheme: Theme = 'system'

type ThemeContextType = {
  /** Current preference: 'light' | 'dark' | 'system' */
  theme: Theme
  defaultTheme: Theme
  setTheme: (theme: Theme) => void
  resetTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

function applyThemePreference(theme: Theme) {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
}

function readStoredPreference(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === '1') return 'dark'
  if (stored === '0') return 'light'
  return 'system'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)

  React.useEffect(() => {
    const preference = readStoredPreference()
    setThemeState(preference)
    applyThemePreference(preference)

    if (preference !== 'system') return
    // While on 'system', follow OS changes live.
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemePreference('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    if (next === 'system') {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, next === 'dark' ? '1' : '0')
    }
    applyThemePreference(next)
  }, [])

  const resetTheme = React.useCallback(() => setTheme(defaultTheme), [setTheme])

  const value = React.useMemo(
    () => ({ theme, defaultTheme, setTheme, resetTheme }),
    [theme, setTheme, resetTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
