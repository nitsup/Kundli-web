'use client';

import Link from 'next/link';
import { useState } from 'react';

const links = [
  ['Kundli', '/kundli'], ['Panchang', '/panchang'], ['Horoscope', '/horoscope'],
  ['Matching', '/matching'], ['Muhurat', '/muhurat'], ['Festivals', '/festivals'],
  ['Articles', '/articles'],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b border-orange-100/80 bg-[#fffaf0]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="grid size-9 place-items-center rounded-full bg-[#7f1d1d] text-lg text-[#ffd166]" aria-hidden="true">ॐ</span>
          <span className="font-serif text-xl font-bold tracking-tight text-[#7f1d1d]">Kundli</span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Main navigation">
          {links.map(([label, href]) => <Link key={href} href={href} className="text-sm font-medium text-[#6b4038] transition hover:text-[#c2410c]">{label}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="text-sm font-semibold text-[#7f1d1d] hover:text-[#c2410c]">Log in</Link>
          <Link href="/signup" className="rounded-full bg-[#7f1d1d] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#991b1b]">Get started</Link>
        </div>
        <button className="rounded-lg p-2 text-[#7f1d1d] lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="text-2xl">{open ? '×' : '☰'}</span>
        </button>
      </div>
      {open && <nav className="border-t border-orange-100 bg-[#fffaf0] px-5 pb-5 lg:hidden" aria-label="Mobile navigation">
        <div className="grid gap-1 pt-3">{links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-[#6b4038] hover:bg-orange-50">{label}</Link>)}</div>
        <div className="mt-3 flex gap-3 border-t border-orange-100 pt-4"><Link href="/login" className="px-3 py-2 font-semibold text-[#7f1d1d]">Log in</Link><Link href="/signup" className="rounded-full bg-[#7f1d1d] px-4 py-2 font-semibold text-white">Get started</Link></div>
      </nav>}
    </header>
  );
}
