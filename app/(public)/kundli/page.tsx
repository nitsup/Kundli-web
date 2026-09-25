import Link from 'next/link';
import { KundliShell } from '@/components/kundli/shell';
import { EmptyState } from '@/components/kundli/states';
export default function KundliPage() {
  return <KundliShell title="Your birth chart"><div className="grid gap-6 md:grid-cols-2"><EmptyState title="Choose a birth profile" /><div className="rounded-2xl border border-[#f1d7a6] bg-white p-6"><h2 className="font-semibold text-[#7f1d1d]">Simple or advanced</h2><p className="mt-2 text-sm leading-6 text-[#795548]">Choose how much detail you want to see. Both modes use the same validated source.</p><div className="mt-5 flex gap-3"><Link href="/kundli/chart?mode=simple" className="rounded-full bg-[#7f1d1d] px-4 py-2 text-sm font-semibold text-white">Simple view</Link><Link href="/kundli/chart?mode=advanced" className="rounded-full border border-[#7f1d1d] px-4 py-2 text-sm font-semibold text-[#7f1d1d]">Advanced view</Link></div></div></div></KundliShell>;
}
