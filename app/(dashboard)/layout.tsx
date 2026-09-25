import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold text-slate-900">User dashboard</h1>
        <p className="text-sm text-slate-600">Authenticated user area reserved for future profile and birth profile workflows.</p>
      </div>
      {children}
    </div>
  );
}
