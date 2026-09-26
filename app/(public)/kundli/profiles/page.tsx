import { EmptyState } from '@/components/kundli/states';
import { KundliShell } from '@/components/kundli/shell';
import { requireAuthenticatedUser } from '@/lib/supabase/auth';

export default async function ProfilesPage() {
  await requireAuthenticatedUser();
  return <KundliShell title="Saved birth profiles"><EmptyState title="No saved profiles" /></KundliShell>;
}
