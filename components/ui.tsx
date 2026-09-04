import { ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger" | "subtle";
  type?: "button" | "submit";
  className?: string;
  [key: string]: any;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
  const variants: Record<string, string> = {
    primary: "bg-ink-900 text-paper-50 hover:bg-ink-800",
    ghost: "bg-transparent text-ink-800 hover:bg-ink-900/5 border border-ink-900/12",
    danger: "bg-clay-500 text-paper-50 hover:bg-clay-500/90",
    subtle: "bg-brass-400/25 text-ink-900 hover:bg-brass-400/40",
  };
  return (
    <button type={type} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-600/70">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-ink-900/15 bg-paper-50 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-600/40 focus:border-brass-600 focus:outline-none focus:ring-2 focus:ring-brass-400/30";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function StatusPill({ status, labels }: { status: "unpaid" | "partial" | "paid"; labels: Record<string, string> }) {
  const styles: Record<string, string> = {
    unpaid: "bg-clay-500/15 text-clay-500",
    partial: "bg-brass-500/20 text-brass-600",
    paid: "bg-okay/15 text-okay",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-ink-900/15 py-16 text-center">
      <p className="max-w-xs text-sm text-ink-600">{title}</p>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-950 sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-600">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
