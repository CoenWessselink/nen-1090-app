export function PaymentLogos() {
  return (
    <div className="payment-logos-grid">
      {/* iDEAL */}
      <span className="payment-logo" aria-label="iDEAL">
        <svg viewBox="0 0 80 40" width="80" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="40" rx="6" fill="#fff"/>
          <rect x="0.5" y="0.5" width="79" height="39" rx="5.5" stroke="#e0e0e0"/>
          <circle cx="22" cy="20" r="9" fill="#CC0066"/>
          <path d="M19 20h6M22 17v6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          <text x="36" y="24" fontFamily="system-ui,sans-serif" fontSize="12" fontWeight="700" fill="#1a1a2e">iDEAL</text>
        </svg>
      </span>

      {/* Wero */}
      <span className="payment-logo" aria-label="Wero">
        <svg viewBox="0 0 80 40" width="80" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="40" rx="6" fill="#00D26A"/>
          <text x="40" y="25" fontFamily="system-ui,sans-serif" fontSize="16" fontWeight="800" fill="#fff" textAnchor="middle">Wero</text>
        </svg>
      </span>

      {/* VISA */}
      <span className="payment-logo" aria-label="Visa">
        <svg viewBox="0 0 80 40" width="80" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="40" rx="6" fill="#1A1F71"/>
          <text x="40" y="26" fontFamily="system-ui,sans-serif" fontSize="18" fontWeight="800" fontStyle="italic" fill="#fff" textAnchor="middle">VISA</text>
          <rect x="0" y="36" width="80" height="4" rx="0 0 6 6" fill="#F7B600"/>
        </svg>
      </span>

      {/* Mastercard */}
      <span className="payment-logo" aria-label="Mastercard">
        <svg viewBox="0 0 80 40" width="80" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="40" rx="6" fill="#fff"/>
          <rect x="0.5" y="0.5" width="79" height="39" rx="5.5" stroke="#e0e0e0"/>
          <circle cx="33" cy="20" r="12" fill="#EB001B"/>
          <circle cx="47" cy="20" r="12" fill="#F79E1B"/>
          <path d="M40 11.6a12 12 0 010 16.8 12 12 0 000-16.8z" fill="#FF5F00"/>
        </svg>
      </span>

      {/* AMEX */}
      <span className="payment-logo" aria-label="American Express">
        <svg viewBox="0 0 80 40" width="80" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="40" rx="6" fill="#006FCF"/>
          <text x="40" y="25" fontFamily="system-ui,sans-serif" fontSize="13" fontWeight="800" fill="#fff" textAnchor="middle">AMEX</text>
        </svg>
      </span>

      {/* PayPal */}
      <span className="payment-logo" aria-label="PayPal">
        <svg viewBox="0 0 80 40" width="80" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="40" rx="6" fill="#fff"/>
          <rect x="0.5" y="0.5" width="79" height="39" rx="5.5" stroke="#e0e0e0"/>
          <text x="40" y="25" fontFamily="system-ui,sans-serif" fontSize="14" fontWeight="800" textAnchor="middle">
            <tspan fill="#003087">Pay</tspan><tspan fill="#009CDE">Pal</tspan>
          </text>
        </svg>
      </span>

      {/* Apple Pay */}
      <span className="payment-logo" aria-label="Apple Pay">
        <svg viewBox="0 0 80 40" width="80" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="40" rx="6" fill="#000"/>
          <text x="40" y="25" fontFamily="system-ui,sans-serif" fontSize="14" fontWeight="600" fill="#fff" textAnchor="middle"> Pay</text>
        </svg>
      </span>

      {/* SEPA */}
      <span className="payment-logo" aria-label="SEPA">
        <svg viewBox="0 0 80 40" width="80" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="40" rx="6" fill="#fff"/>
          <rect x="0.5" y="0.5" width="79" height="39" rx="5.5" stroke="#e0e0e0"/>
          <circle cx="28" cy="20" r="10" fill="none" stroke="#003399" strokeWidth="1.5"/>
          <g transform="translate(28,20)">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
              <circle
                key={angle}
                cx={Math.cos((angle * Math.PI) / 180) * 8}
                cy={Math.sin((angle * Math.PI) / 180) * 8}
                r="1"
                fill="#003399"
              />
            ))}
          </g>
          <text x="52" y="24" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="700" fill="#003399" textAnchor="middle">SEPA</text>
        </svg>
      </span>
    </div>
  );
}
