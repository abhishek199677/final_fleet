'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  PlayCircle,
  PauseCircle,
  Droplets,
  Receipt,
  Banknote,
  Calculator,
  Wrench,
  History,
} from 'lucide-react';

const opsNav = [
  { href: '/today', label: 'Today', icon: LayoutDashboard },
  { href: '/work-session', label: 'Work Session', icon: PlayCircle },
  { href: '/downtime', label: 'Downtime', icon: PauseCircle },
  { href: '/fuel', label: 'Fuel', icon: Droplets },
  { href: '/expense', label: 'Expense', icon: Receipt },
  { href: '/receipt', label: 'Receipt', icon: Banknote },
  { href: '/cash-count', label: 'Cash Count', icon: Calculator },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/history', label: 'History', icon: History },
];

export function OpsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto py-1">
      {opsNav.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
