import Link from 'next/link';

import { KundliShell } from '@/components/kundli/shell';
import { UnavailableState } from '@/components/kundli/states';
import { requireAuthenticatedUser } from '@/lib/supabase/auth';

export default async function CreateKundliPage() {
  await requireAuthenticatedUser();
  return (
    <KundliShell title="Create a Kundli">
      <div className="space-y-5">
        <UnavailableState feature="Kundli calculation" />
        <p className="text-sm leading-6 text-[#795548]">
          Birth profile forms will be connected after the verified calculation workflow is approved.
        </p>
        <Link href="/kundli/profiles" className="inline-flex rounded-full border border-[#7f1d1d] px-4 py-2 text-sm font-semibold text-[#7f1d1d]">
          View saved profiles
        </Link>
      </div>
    </KundliShell>
  );
}
