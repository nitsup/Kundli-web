import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffaf0] text-[#3c1f1a]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
