
/**
 * Modern vector illustration for empty articles / search not found
 * In the style of Icons8 Ouch / Storyset.
 */
export function EmptyArticlesIllustration({ size = 180, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`mx-auto ${className}`}
    >
      <circle cx="100" cy="100" r="80" fill="currentColor" fillOpacity="0.05" />
      {/* Background shapes */}
      <circle cx="150" cy="50" r="14" fill="currentColor" fillOpacity="0.1" />
      <circle cx="45" cy="140" r="8" fill="currentColor" fillOpacity="0.1" />
      <polygon points="160,130 168,144 152,144" fill="currentColor" fillOpacity="0.12" />

      {/* Main Document / Book Base */}
      <rect
        x="55"
        y="45"
        width="90"
        height="115"
        rx="12"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Document Fold / Accent */}
      <path
        d="M115 45L145 75H127C120.373 75 115 69.6274 115 63V45Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Code / Text lines */}
      <line x1="72" y1="85" x2="105" y2="85" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="72" y1="102" x2="128" y2="102" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="72" y1="119" x2="120" y2="119" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="72" y1="136" x2="95" y2="136" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.3" />

      {/* Magnifier Glass overlay */}
      <circle cx="126" cy="132" r="22" fill="var(--color-base-100, #ffffff)" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="126" cy="132" r="14" fill="currentColor" fillOpacity="0.08" />
      <line x1="142" y1="148" x2="162" y2="168" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />

      {/* Sparkles */}
      <path d="M48 60L52 64L48 68L44 64Z" fill="currentColor" fillOpacity="0.6" />
      <path d="M165 92L168 95L165 98L162 95Z" fill="currentColor" fillOpacity="0.6" />
    </svg>
  );
}

/**
 * Modern vector illustration for 404 / Error State
 */
export function NotFoundIllustration({ size = 180, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`mx-auto ${className}`}
    >
      <circle cx="100" cy="100" r="85" fill="currentColor" fillOpacity="0.05" />
      {/* 404 text styled */}
      <text
        x="100"
        y="85"
        textAnchor="middle"
        fontSize="48"
        fontWeight="900"
        fill="currentColor"
        letterSpacing="2"
      >
        404
      </text>
      {/* Computer monitor with disconnected cable */}
      <rect x="50" y="105" width="100" height="60" rx="8" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.1" />
      <line x1="100" y1="165" x2="100" y2="180" stroke="currentColor" strokeWidth="4" />
      <line x1="75" y1="180" x2="125" y2="180" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="135" r="8" fill="currentColor" fillOpacity="0.3" />
      <line x1="88" y1="135" x2="112" y2="135" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default EmptyArticlesIllustration;

/**
 * Modern colorful vector illustration for empty notifications
 * In the style of Icons8 / Storyset.
 */
export function EmptyNotificationsIllustration({ size = 120, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`mx-auto ${className}`}
    >
      <defs>
        <linearGradient id="bellGrad" x1="40" y1="30" x2="120" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="bgCircle" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" stopOpacity="0.12" />
          <stop offset="1" stopColor="#A855F7" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Soft background aura */}
      <circle cx="80" cy="80" r="65" fill="url(#bgCircle)" />

      {/* Decorative stars / sparkles */}
      <path d="M125 45L127 51L133 53L127 55L125 61L123 55L117 53L123 51L125 45Z" fill="#F59E0B" />
      <path d="M35 105L36.5 109.5L41 111L36.5 112.5L35 117L33.5 112.5L29 111L33.5 109.5L35 105Z" fill="#8B5CF6" />
      <circle cx="120" cy="115" r="4" fill="#3B82F6" fillOpacity="0.6" />
      <circle cx="42" cy="50" r="3" fill="#10B981" fillOpacity="0.6" />

      {/* Bell Top Handle */}
      <rect x="74" y="32" width="12" height="12" rx="6" fill="#F59E0B" />

      {/* Bell Body */}
      <path
        d="M80 40C62 40 52 54 52 76C52 92 45 98 42 102C40 105 42 108 46 108H114C118 108 120 105 118 102C115 98 108 92 108 76C108 54 98 40 80 40Z"
        fill="url(#bellGrad)"
      />

      {/* Bell highlight arc */}
      <path
        d="M60 76C60 62 68 50 80 50"
        stroke="#FEF3C7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Bell Clapper */}
      <circle cx="80" cy="116" r="8" fill="#B45309" />

      {/* Peaceful Checkmark Badge in front */}
      <circle cx="108" cy="100" r="14" fill="#10B981" />
      <path d="M103 100L106.5 103.5L113.5 96.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Modern colorful vector illustration for empty bookmarks
 */
export function EmptyBookmarksIllustration({ size = 120, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`mx-auto ${className}`}
    >
      <circle cx="80" cy="80" r="65" fill="#3B82F6" fillOpacity="0.08" />
      <path d="M60 40H100C104.4 40 108 43.6 108 48V125L80 110L52 125V48C52 43.6 55.6 40 60 40Z" fill="#3B82F6" fillOpacity="0.85" />
      <path d="M60 40H80V110L72 105.7L52 116V48C52 43.6 55.6 40 60 40Z" fill="#2563EB" />
      <circle cx="80" cy="70" r="10" fill="#FEF08A" />
      <path d="M80 64L82 68L86 69L83 72L84 76L80 74L76 76L77 72L74 69L78 68L80 64Z" fill="#CA8A04" />
    </svg>
  );
}
