export default function SpeakerIcon({ size = 18, className = '' }) {
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
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path className="speaker-wave speaker-wave-1" d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path className="speaker-wave speaker-wave-2" d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}
