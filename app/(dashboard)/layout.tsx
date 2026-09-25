import type { ReactNode } from 'react';

import { requireAuthenticatedUser } from '@/lib/supabase/auth';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireAuthenticatedUser();

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
      <div className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="text-2xl font-semibold text-[var(--deep-red)]">User dashboard</h1>
        <p className="text-sm text-[var(--muted)]">Authenticated user area reserved for future profile and birth profile workflows.</p>
      </div>
      {children}
    </div>
  );
}
