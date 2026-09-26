import type { ReactNode } from 'react';

import { KundliShell } from '@/components/kundli/shell';
import { requireAuthenticatedUser } from '@/lib/supabase/auth';

export default async function KundliDetailLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAuthenticatedUser();

  return (
    <KundliShell title={`Kundli ${id}`}>
      {children}
    </KundliShell>
  );
}
