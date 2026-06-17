export function VisaIcon() {
  return (
    <svg viewBox="0 0 48 32" width="38" height="25" role="img" aria-label="Visa">
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <text x="24" y="21" textAnchor="middle" fontFamily="Arial, sans-serif" fontStyle="italic" fontWeight="bold" fontSize="13" fill="#fff">VISA</text>
    </svg>
  )
}

export function MastercardIcon() {
  return (
    <svg viewBox="0 0 48 32" width="38" height="25" role="img" aria-label="Mastercard">
      <rect width="48" height="32" rx="4" fill="#fff" />
      <circle cx="20" cy="16" r="9" fill="#EB001B" />
      <circle cx="28" cy="16" r="9" fill="#F79E1B" />
      <path d="M24 8.3a9 9 0 0 1 0 15.4 9 9 0 0 1 0-15.4z" fill="#FF5F00" />
    </svg>
  )
}

export function UpiIcon() {
  return (
    <svg viewBox="0 0 48 32" width="38" height="25" role="img" aria-label="UPI">
      <rect width="48" height="32" rx="4" fill="#fff" />
      <text x="24" y="21" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="13">
        <tspan fill="#097939">UP</tspan><tspan fill="#ED752E">I</tspan>
      </text>
    </svg>
  )
}

export function RazorpayIcon() {
  return (
    <svg viewBox="0 0 64 32" width="50" height="25" role="img" aria-label="Razorpay">
      <rect width="64" height="32" rx="4" fill="#fff" />
      <path d="M27 8 L17 24 H23 L33 8 Z" fill="#3395FF" />
      <path d="M33 8 L29 17 H35 L31 26 L41 13 H35 Z" fill="#072654" />
      <text x="58" y="21" textAnchor="end" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10" fill="#072654">Razorpay</text>
    </svg>
  )
}

export function CodIcon() {
  return (
    <svg viewBox="0 0 48 32" width="38" height="25" role="img" aria-label="Cash on Delivery">
      <rect width="48" height="32" rx="4" fill="#0F3D22" />
      <rect x="6" y="10" width="36" height="12" rx="2" fill="none" stroke="#D4A017" strokeWidth="1.5" />
      <circle cx="24" cy="16" r="3.5" fill="#D4A017" />
      <text x="24" y="28" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="8" fill="#fff">COD</text>
    </svg>
  )
}
