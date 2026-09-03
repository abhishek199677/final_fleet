import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Fleet OS</h1>
        <p className="text-xl text-muted-foreground">
          Multi-tenant SaaS for heavy-equipment operators
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/home"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Owner Portal
          </Link>
          <Link
            href="/today"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Operations Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
