'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  ['Kundli', '/kundli'], ['Panchang', '/panchang'], ['Horoscope', '/horoscope'],
  ['Matching', '/matching'], ['Muhurat', '/muhurat'], ['Festivals', '/festivals'],
  ['Articles', '/articles'],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const linkClass = (href: string) => `rounded-md px-2 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c] ${pathname === href || pathname.startsWith(`${href}/`) ? 'bg-[#fff0d2] text-[#7f1d1d]' : 'text-[#6b4038] hover:text-[#c2410c]'}`;
  return (
    <header className="sticky top-0 z-20 border-b border-orange-100/80 bg-[#fffaf0]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="grid size-9 place-items-center rounded-full bg-[#7f1d1d] text-lg text-[#ffd166]" aria-hidden="true">ॐ</span>
          <span className="font-serif text-xl font-bold tracking-tight text-[#7f1d1d]">Kundli</span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Main navigation">
          {links.map(([label, href]) => <Link key={href} href={href} className={linkClass(href)} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="rounded-md px-2 py-2 text-sm font-semibold text-[#7f1d1d] transition hover:text-[#c2410c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c]">Log in</Link>
          <Link href="/signup" className="rounded-full bg-[#7f1d1d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#991b1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c] focus-visible:ring-offset-2">Get started</Link>
        </div>
        <button className="min-h-11 min-w-11 rounded-lg p-2 text-[#7f1d1d] transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c] lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
          <span className="text-2xl">{open ? '×' : '☰'}</span>
        </button>
      </div>
      {open && <nav id="mobile-navigation" className="border-t border-orange-100 bg-[#fffaf0] px-5 pb-5 lg:hidden" aria-label="Mobile navigation">
        <div className="grid gap-1 pt-3">{links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={linkClass(href)} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}</div>
        <div className="mt-3 flex gap-3 border-t border-orange-100 pt-4"><Link href="/login" className="rounded-md px-3 py-2 font-semibold text-[#7f1d1d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c]">Log in</Link><Link href="/signup" className="rounded-full bg-[#7f1d1d] px-4 py-2.5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c] focus-visible:ring-offset-2">Get started</Link></div>
      </nav>}
    </header>
  );
}
