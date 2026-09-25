import { useCallback, useEffect, useMemo } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'

/**
 * Theme toggle button for switching between light and dark themes.
 * Provides accessible toggle functionality with proper screen reader support.
 */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme()

  /* Update theme-color meta tag
   * when theme is updated */
  useEffect(() => {
    const themeColor = theme === 'dark' ? '#020817' : '#fff'
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor)
  }, [theme])

  // Determine effective theme (resolve 'system' to light/dark based on preference)
  const effectiveTheme = useMemo(() => {
    if (theme !== 'system') return theme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [theme])
  const isDarkMode = effectiveTheme === 'dark'

  const toggleTheme = useCallback(() => {
    // Determine current effective theme (resolve 'system' to actual light/dark)
    const currentEffective = theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : theme;

    // Toggle between light and dark based on current effective theme
    const newTheme = currentEffective === 'dark' ? 'light' : 'dark';

    setTheme(newTheme);
  }, [theme, setTheme])

  return (
    <div className='flex justify-between items-center w-full'>
      <span className='text-base font-medium text-gray-500 dark:text-gray-400'>
        Theme
      </span>
      <Button
        variant='ghost'
        size='icon'
        className='scale-95 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        onClick={toggleTheme}
        aria-label='Toggle theme'
        role="switch"
        aria-checked={isDarkMode}
      >
        <Sun className='size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
        <Moon className='absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
        <span className='sr-only'>Toggle theme</span>
      </Button>
    </div>
  )
}
