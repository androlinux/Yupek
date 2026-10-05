export function Pattern({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <path d="M24 3L45 24 24 45 3 24zM24 12L36 24 24 36 12 24zM24 20L28 24 24 28 20 24z" />
    </svg>
  );
}
export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold ${className}`} aria-hidden="true">
      <span className="h-px w-10 bg-gold/50" /><Pattern className="h-3.5 w-3.5" /><span className="h-px w-10 bg-gold/50" />
    </div>
  );
}
