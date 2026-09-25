import type { ReactNode } from 'react';

import { requireRole } from '@/lib/supabase/auth';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole(['admin'], '/dashboard');
  return children;
}
