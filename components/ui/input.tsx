type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name ?? 'field';

  return (
    <label htmlFor={inputId} className="block space-y-2 text-sm font-medium text-slate-700">
      {label ? <span>{label}</span> : null}
      <input
        id={inputId}
        className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${className}`}
        {...props}
      />
    </label>
  );
}
