import { OwnerShell } from '@/components/nav/owner-shell';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <OwnerShell>{children}</OwnerShell>;
}
