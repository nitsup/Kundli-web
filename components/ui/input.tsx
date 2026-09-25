type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name ?? 'field';

  return (
    <label htmlFor={inputId} className="block space-y-2 text-sm font-medium text-[var(--muted-strong)]">
      {label ? <span>{label}</span> : null}
      <input
        id={inputId}
        className={`min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[var(--saffron)] focus:ring-2 focus:ring-orange-100 ${className}`}
        {...props}
      />
    </label>
  );
}
