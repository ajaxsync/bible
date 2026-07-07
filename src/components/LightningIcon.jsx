export default function LightningIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path className="lightning-bolt" d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  )
}
