import type { ReactElement, SVGProps } from 'react'
import {
  AlignJustify,
  ArrowLeft,
  ArrowRight,
  Expand,
  LayoutGrid,
  Maximize,
  Monitor,
  Moon,
  PanelLeft,
  PanelLeftDashed,
  RectangleHorizontal,
  Square,
  Sun,
} from 'lucide-react'

/**
 * Standalone preview icons for the ConfigDrawer, replacing the template's
 * `@/assets/custom/*` SVGs (not shipped with this project). Shapes are kept
 * simple so they read correctly both stroked (theme radios) and filled
 * (`fill-primary stroke-primary` on layout/sidebar radios).
 */

type IconProps = SVGProps<SVGSVGElement>

export function IconThemeSystem(props: IconProps): ReactElement {
  return <Monitor {...props} />
}

export function IconThemeLight(props: IconProps): ReactElement {
  return <Sun {...props} />
}

export function IconThemeDark(props: IconProps): ReactElement {
  return <Moon {...props} />
}

export function IconSidebarInset(props: IconProps): ReactElement {
  return <PanelLeft {...props} />
}

export function IconSidebarFloating(props: IconProps): ReactElement {
  return <Square {...props} />
}

export function IconSidebarSidebar(props: IconProps): ReactElement {
  return <PanelLeftDashed {...props} />
}

export function IconLayoutDefault(props: IconProps): ReactElement {
  return <RectangleHorizontal {...props} />
}

export function IconLayoutCompact(props: IconProps): ReactElement {
  return <AlignJustify {...props} />
}

export function IconLayoutFull(props: IconProps): ReactElement {
  return <Maximize {...props} />
}

export function IconDir(
  props: IconProps & { dir?: string }
): ReactElement {
  const { dir = 'ltr', ...rest } = props
  if (dir === 'rtl') return <ArrowLeft {...rest} />
  if (dir === 'auto') return <LayoutGrid {...rest} />
  if (dir === 'inherit') return <Expand {...rest} />
  return <ArrowRight {...rest} />
}
