import type { ReactNode } from 'react';

export function StateCard({ title, children, tone = 'neutral' }: { title: string; children: ReactNode; tone?: 'neutral' | 'warning' | 'error' }) {
  const colors = tone === 'error' ? 'border-red-200 bg-red-50' : tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-[#f1d7a6] bg-[#fff5e1]';
  return <div className={`rounded-2xl border p-6 ${colors}`} role="status"><h2 className="font-semibold text-[#7f1d1d]">{title}</h2><div className="mt-2 text-sm leading-6 text-[#795548]">{children}</div></div>;
}
export function UnavailableState({ feature }: { feature: string }) { return <StateCard title={`${feature} is not available yet`} tone="warning">No calculation provider is connected. We will show results only when they can be verified.</StateCard>; }
export function EmptyState({ title = 'Nothing to show yet' }: { title?: string }) { return <StateCard title={title}>Create or select a saved birth profile to continue. Your data remains private to your account.</StateCard>; }
export function LoadingState() { return <StateCard title="Preparing your view">Loading verified information…</StateCard>; }
export function ErrorState() { return <StateCard title="We could not load this view" tone="error">Please try again later. No incomplete result has been displayed.</StateCard>; }
