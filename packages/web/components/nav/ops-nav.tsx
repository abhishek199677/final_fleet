'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const opsNav = [
  { href: '/today', label: 'Today' },
  { href: '/work-session', label: 'Work Session' },
  { href: '/downtime', label: 'Downtime' },
  { href: '/fuel', label: 'Fuel' },
  { href: '/expense', label: 'Expense' },
  { href: '/receipt', label: 'Receipt' },
  { href: '/maintenance', label: 'Maintenance' },
  { href: '/history', label: 'History' },
];

export function OpsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {opsNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname === item.href ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
