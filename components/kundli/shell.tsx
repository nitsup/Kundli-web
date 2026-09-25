import Link from 'next/link';
import type { ReactNode } from 'react';
import { UnavailableState } from './states';

const links = [['Overview', '/kundli'], ['Chart', '/kundli/chart'], ['Planets', '/kundli/planets'], ['Houses', '/kundli/houses'], ['Nakshatras', '/kundli/nakshatras'], ['Dashas', '/kundli/dashas'], ['Insights', '/kundli/insights'], ['Timeline', '/kundli/timeline']] as const;
export function KundliShell({ title, children, unavailable = false }: { title: string; children?: ReactNode; unavailable?: boolean }) {
  return <section className="mx-auto max-w-6xl"><div className="mb-8"><p className="text-sm font-bold uppercase tracking-[0.22em] text-[#c2410c]">Kundli workspace</p><h1 className="mt-2 font-serif text-4xl font-bold text-[#7f1d1d]">{title}</h1></div><nav aria-label="Kundli navigation" className="mb-8 flex flex-wrap gap-2">{links.map(([label, href]) => <Link key={href} href={href} className="rounded-full border border-[#eccb91] px-4 py-2 text-sm text-[#7f1d1d] hover:bg-[#fff0d2]">{label}</Link>)}</nav>{unavailable ? <UnavailableState feature={title} /> : children}</section>;
}
