export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-lg bg-brass-500 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none">
        <path d="M4 11.5 12 4l8 7.5H17V20H7v-8.5H4Z" fill="#131D18" />
        <rect x="10.2" y="15" width="3.6" height="5" rx="1.4" fill="#D4A94F" />
      </svg>
    </div>
  );
}
