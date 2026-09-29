'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LEGAL_LINKS } from '@/lib/site-info';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

/** Legal section navigation with `aria-current="page"` on the active document. */
export function LegalNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Legal documents" className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {LEGAL_LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`text-sm transition-colors hover:text-teal-700 ${focusRing} ${
              active ? 'font-semibold text-teal-700' : 'font-medium text-gray-600'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
