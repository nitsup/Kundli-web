import type { ReactNode } from 'react';

export function Card({ title, description, children }: { title?: string; description?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#f1d7a6] bg-white p-5 shadow-sm">
      {title ? <h2 className="text-lg font-semibold text-[#7f1d1d]">{title}</h2> : null}
      {description ? <p className="mt-2 text-sm text-[#795548]">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
