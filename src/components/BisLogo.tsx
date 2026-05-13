export default function BisLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* House shape */}
      <rect width="40" height="40" rx="10" fill="#1e293b"/>
      {/* Roof */}
      <path d="M20 8L32 18H8L20 8Z" fill="#f8fafc"/>
      {/* Building */}
      <rect x="12" y="18" width="16" height="14" fill="#f8fafc"/>
      {/* Door */}
      <rect x="17" y="24" width="6" height="8" rx="1" fill="#1e293b"/>
      {/* Window */}
      <rect x="14" y="20" width="4" height="3" rx="0.5" fill="#3b82f6"/>
      <rect x="22" y="20" width="4" height="3" rx="0.5" fill="#3b82f6"/>
    </svg>
  );
}
