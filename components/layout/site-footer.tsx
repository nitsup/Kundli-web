import Link from 'next/link';

export function SiteFooter() {
  return <footer className="border-t border-orange-100 bg-[#fff5e1]">
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 text-sm text-[#795548] sm:px-8 md:flex-row md:items-center md:justify-between">
      <div><p className="font-serif text-lg font-bold text-[#7f1d1d]">Kundli</p><p className="mt-1">Ancient wisdom, thoughtfully made.</p></div>
      <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer navigation"><Link href="/methodology">Our approach</Link><Link href="/articles">Articles</Link><Link href="/login">Account</Link></nav>
      <p>© {new Date().getFullYear()} Kundli. Coming soon.</p>
    </div>
  </footer>;
}
