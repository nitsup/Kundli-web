import type { ReactNode } from 'react';

export function Card({ title, description, children }: { title?: string; description?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      {title ? <h2 className="text-lg font-semibold text-[var(--deep-red)]">{title}</h2> : null}
      {description ? <p className="mt-2 text-sm text-[var(--muted)]">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
