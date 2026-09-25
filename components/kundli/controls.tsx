'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { PresentationMode } from '@/lib/domain/types';

export function PresentationModeSwitch({ mode = 'simple', basePath }: { mode?: PresentationMode; basePath: string }) {
  return (
    <div className="inline-flex rounded-full border border-[#eccb91] bg-white p-1" aria-label="Presentation mode">
      {(['simple', 'advanced'] as const).map((option) => (
        <Link
          key={option}
          href={`${basePath}?mode=${option}`}
          aria-current={mode === option ? 'true' : undefined}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${mode === option ? 'bg-[#7f1d1d] text-white' : 'text-[#7f1d1d] hover:bg-[#fff0d2]'}`}
        >
          {option}
        </Link>
      ))}
    </div>
  );
}

export function DateSelector({ initialDate }: { initialDate?: string }) {
  const [date, setDate] = useState(initialDate ?? '');

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-[#6b4038]">
      <span className="sr-only">Selected date</span>
      <input
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        className="rounded-lg border border-[#eccb91] bg-white px-3 py-2 text-sm text-[#3c1f1a] outline-none focus:border-[#c2410c] focus:ring-2 focus:ring-orange-200"
      />
    </label>
  );
}

export function ExplanationPanel() {
  return (
    <details className="rounded-2xl border border-[#f1d7a6] bg-white p-5">
      <summary className="cursor-pointer font-semibold text-[#7f1d1d]">Why am I seeing this?</summary>
      <p className="mt-3 text-sm leading-6 text-[#795548]">
        Calculation and interpretation evidence will appear here once a verified chart is available.
      </p>
    </details>
  );
}
