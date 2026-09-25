import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          Kundli-Web
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <Link href="/kundli" className="hover:text-slate-900">Kundli</Link>
          <Link href="/login" className="hover:text-slate-900">Login</Link>
        </nav>
      </div>
    </header>
  );
}
