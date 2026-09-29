// All icons are authored as JSX, never injected via innerHTML/dangerouslySetInnerHTML.
// That removes an entire class of XSS risk that string-built SVG markup would carry.

export function BellIcon() {
  return (
    <svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden="true">
      <path d="M10 1C7 1 4.6 3.4 4.6 6.4V10.2C4.6 10.9 4.3 11.6 3.8 12.1L2 14V15.5H18V14L16.2 12.1C15.7 11.6 15.4 10.9 15.4 10.2V6.4C15.4 3.4 13 1 10 1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.5 18.5C7.9 19.6 8.86 20.4 10 20.4C11.14 20.4 12.1 19.6 12.5 18.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10.5L8 14.5L16 5.5" stroke="#2F6B18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AbsentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5L15 15M15 5L5 15" stroke="#E2574C" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GuardianIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="6.5" r="3.5" fill="#2F6B18" />
      <path d="M2.5 17.5C2.5 13.9 6 11.8 10 11.8C14 11.8 17.5 13.9 17.5 17.5" stroke="#2F6B18" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg className="chevron" width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true">
      <path d="M1 1L7 7L1 13" stroke="#9BAE93" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VanIcon({ width = 22, height = 22, className = '' }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10 17h4" />
      <path d="M2 17h2" />
      <path d="M18 17h4" />
      <path d="M4 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M2 11h19a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3a2 2 0 0 1 1-1.73l1.8-3.6A2 2 0 0 1 5.6 6h7.8a2 2 0 0 1 1.6.8l2 2.7" />
      <path d="M14 6v5" />
      <path d="M2 11V6a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

export function LogoutIcon({ width = 18, height = 18 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function ShieldIcon({ width = 20, height = 20 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function KeyIcon({ width = 20, height = 20 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m21 3-9.5 9.5" />
      <path d="m15.5 7.5 3 3" />
      <path d="m18.5 4.5 3 3" />
    </svg>
  );
}

export function MapPinIcon({ width = 18, height = 18 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function UserCheckIcon({ width = 18, height = 18 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  );
}

export function CrossIcon({ width = 16, height = 16 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
