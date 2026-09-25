import type { ReactNode } from 'react';

import { KundliShell } from '@/components/kundli/shell';

export default async function KundliDetailLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <KundliShell title={`Kundli ${id}`}>
      {children}
    </KundliShell>
  );
}
