import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full bg-[#7f1d1d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#991b1b] focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
