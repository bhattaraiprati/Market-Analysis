type LoadingSpinnerProps = {
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const spinnerSizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({
  label = 'Loading…',
  showLabel = true,
  size = 'md',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center justify-center gap-3 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`${spinnerSizes[size]} animate-spin rounded-full border-current border-t-transparent`}
      />
      <span className={showLabel ? 'text-sm font-medium' : 'sr-only'}>{label}</span>
    </div>
  );
}
