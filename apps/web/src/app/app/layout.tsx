import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { Mic, LayoutDashboard, CreditCard } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/app" className="flex items-center gap-2 font-semibold">
            <Mic className="h-5 w-5" />
            transcribe-ai
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/app"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-muted"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Link
              href="/app/record"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-muted"
            >
              <Mic className="h-4 w-4" /> Enregistrer
            </Link>
            <Link
              href="/app/billing"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-muted"
            >
              <CreditCard className="h-4 w-4" /> Billing
            </Link>
            <div className="pl-2">
              <UserButton afterSignOutUrl="/" />
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
