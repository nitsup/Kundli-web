import type { ReactNode } from 'react';

import { requireRole } from '@/lib/supabase/auth';

export default async function PanditLayout({ children }: { children: ReactNode }) {
  await requireRole(['pandit', 'admin'], '/dashboard');
  return children;
}
