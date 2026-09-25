import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

const variants = {
  primary: 'bg-[var(--deep-red)] text-white hover:bg-[var(--deep-red-hover)]',
  secondary: 'border border-[var(--deep-red)] bg-transparent text-[var(--deep-red)] hover:bg-red-50',
  accent: 'bg-[var(--highlight)] text-[var(--deep-red)] hover:bg-[#ffe29a]',
} as const;

const baseClassName = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--saffron)] focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60';

export function buttonClassName(variant: keyof typeof variants = 'primary', className = '') {
  return `${baseClassName} ${variants[variant]} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: keyof typeof variants;
  loading?: boolean;
};

export function Button({ children, className = '', variant = 'primary', loading = false, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={buttonClassName(variant, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

export function ButtonLink({ href, children, className = '', variant = 'primary' }: { href: string; children: ReactNode; className?: string; variant?: keyof typeof variants }) {
  return <Link href={href} className={buttonClassName(variant, className)}>{children}</Link>;
}
