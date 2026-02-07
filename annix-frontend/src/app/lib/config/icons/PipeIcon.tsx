"use client";

interface PipeIconProps {
  className?: string;
  size?: number;
}

// Horizontal steel pipe with realistic chrome/metallic finish
export function SteelPipeIcon({ className = "", size = 24 }: PipeIconProps) {
  const width = size * 2.5;
  const height = size;

  return (
    <svg width={width} height={height} viewBox="0 0 60 24" fill="none" className={className}>
      <defs>
        {/* Metallic gradient for pipe body */}
        <linearGradient id="steelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E8E8E8" />
          <stop offset="15%" stopColor="#F5F5F5" />
          <stop offset="30%" stopColor="#D4D4D4" />
          <stop offset="50%" stopColor="#B8B8B8" />
          <stop offset="70%" stopColor="#A0A0A0" />
          <stop offset="85%" stopColor="#888888" />
          <stop offset="100%" stopColor="#707070" />
        </linearGradient>
        {/* Gradient for the pipe end face */}
        <radialGradient id="endFaceGradient" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#D0D0D0" />
          <stop offset="50%" stopColor="#A8A8A8" />
          <stop offset="100%" stopColor="#808080" />
        </radialGradient>
        {/* Inner hole gradient */}
        <radialGradient id="innerHoleGradient" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#505050" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </radialGradient>
      </defs>

      {/* Pipe body - main cylinder */}
      <rect x="8" y="4" width="52" height="16" rx="0" fill="url(#steelGradient)" />

      {/* Top highlight line */}
      <line x1="8" y1="5" x2="60" y2="5" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" />

      {/* Secondary highlight */}
      <line x1="8" y1="7" x2="60" y2="7" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.3" />

      {/* Bottom shadow line */}
      <line x1="8" y1="19" x2="60" y2="19" stroke="#505050" strokeWidth="1" opacity="0.4" />

      {/* Pipe end - outer ellipse (visible end face) */}
      <ellipse
        cx="8"
        cy="12"
        rx="4"
        ry="8"
        fill="url(#endFaceGradient)"
        stroke="#606060"
        strokeWidth="0.5"
      />

      {/* Pipe end - wall thickness ring */}
      <ellipse cx="8" cy="12" rx="3" ry="6" fill="none" stroke="#888888" strokeWidth="0.3" />

      {/* Pipe end - inner hole (hollow) */}
      <ellipse cx="8" cy="12" rx="2" ry="4" fill="url(#innerHoleGradient)" />

      {/* Highlight on the end face */}
      <ellipse cx="6" cy="9" rx="1" ry="2" fill="#FFFFFF" opacity="0.3" />

      {/* Subtle reflection on body */}
      <rect x="20" y="6" width="25" height="2" rx="1" fill="#FFFFFF" opacity="0.15" />
    </svg>
  );
}

// Keep old options for reference
export function PipeIconA({ className = "", size = 24 }: PipeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <ellipse cx="12" cy="4" rx="8" ry="2.5" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1" />
      <path
        d="M4 4 L4 18 A8 2.5 0 0 0 20 18 L20 4"
        fill="#D1D5DB"
        stroke="#6B7280"
        strokeWidth="1"
      />
      <ellipse cx="12" cy="18" rx="8" ry="2.5" fill="#E5E7EB" stroke="#6B7280" strokeWidth="1" />
      <ellipse cx="12" cy="4" rx="4.5" ry="1.4" fill="#4B5563" />
      <path d="M6 6 L6 16" stroke="#F9FAFB" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

export function PipeIconB({ className = "", size = 24 }: PipeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 8 C3 5.5 7 4 12 4 C17 4 21 5.5 21 8 L21 16 C21 18.5 17 20 12 20 C7 20 3 18.5 3 16 Z"
        fill="#D1D5DB"
        stroke="#6B7280"
        strokeWidth="1"
      />
      <ellipse cx="12" cy="8" rx="9" ry="3" fill="#E5E7EB" stroke="#6B7280" strokeWidth="1" />
      <ellipse cx="12" cy="8" rx="5" ry="1.7" fill="#374151" />
      <path d="M5 10 L5 17" stroke="#FFFFFF" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
    </svg>
  );
}

export function PipeIconC({ className = "", size = 24 }: PipeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <ellipse cx="12" cy="6" rx="10" ry="3" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1" />
      <circle cx="5" cy="6" r="1" fill="#4B5563" />
      <circle cx="19" cy="6" r="1" fill="#4B5563" />
      <path d="M5 6 L5 20 A7 2 0 0 0 19 20 L19 6" fill="#D1D5DB" stroke="#6B7280" strokeWidth="1" />
      <ellipse cx="12" cy="6" rx="7" ry="2" fill="#B0B0B0" stroke="#6B7280" strokeWidth="0.5" />
      <ellipse cx="12" cy="6" rx="4" ry="1.2" fill="#374151" />
      <path d="M7 8 L7 18" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
    </svg>
  );
}

// PVC Pipe - Blue plastic pipe (like Image 6)
export function PvcPipeIcon({ className = "", size = 24 }: PipeIconProps) {
  const width = size * 2.5;
  const height = size;

  return (
    <svg width={width} height={height} viewBox="0 0 60 24" fill="none" className={className}>
      <defs>
        {/* Blue PVC gradient */}
        <linearGradient id="pvcGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4BA3E3" />
          <stop offset="15%" stopColor="#3B9AD9" />
          <stop offset="35%" stopColor="#2B8BC9" />
          <stop offset="50%" stopColor="#1E7AB8" />
          <stop offset="70%" stopColor="#1669A3" />
          <stop offset="85%" stopColor="#0F5A8F" />
          <stop offset="100%" stopColor="#0A4B7A" />
        </linearGradient>
        {/* Gradient for the pipe end face */}
        <radialGradient id="pvcEndGradient" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#5BB5F0" />
          <stop offset="50%" stopColor="#2B8BC9" />
          <stop offset="100%" stopColor="#0F5A8F" />
        </radialGradient>
        {/* Inner hole gradient */}
        <radialGradient id="pvcInnerGradient" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1a3a50" />
          <stop offset="100%" stopColor="#0a1520" />
        </radialGradient>
      </defs>

      {/* Pipe body - main cylinder */}
      <rect x="8" y="4" width="52" height="16" rx="0" fill="url(#pvcGradient)" />

      {/* Top highlight line - glossy plastic */}
      <line x1="8" y1="5" x2="60" y2="5" stroke="#7EC8F5" strokeWidth="2" opacity="0.7" />

      {/* Secondary highlight */}
      <line x1="8" y1="8" x2="60" y2="8" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.3" />

      {/* Bottom shadow line */}
      <line x1="8" y1="19" x2="60" y2="19" stroke="#083558" strokeWidth="1" opacity="0.5" />

      {/* Pipe end - outer ellipse */}
      <ellipse
        cx="8"
        cy="12"
        rx="4"
        ry="8"
        fill="url(#pvcEndGradient)"
        stroke="#0A4B7A"
        strokeWidth="0.5"
      />

      {/* Pipe end - wall thickness ring */}
      <ellipse cx="8" cy="12" rx="3" ry="6" fill="none" stroke="#1E7AB8" strokeWidth="0.3" />

      {/* Pipe end - inner hole */}
      <ellipse cx="8" cy="12" rx="2" ry="4" fill="url(#pvcInnerGradient)" />

      {/* Highlight on the end face */}
      <ellipse cx="6" cy="9" rx="1" ry="2" fill="#FFFFFF" opacity="0.4" />

      {/* Glossy reflection on body */}
      <rect x="15" y="5.5" width="30" height="2.5" rx="1" fill="#FFFFFF" opacity="0.2" />
    </svg>
  );
}

// HDPE Pipe - Black with blue stripe (like Image 7)
export function HdpePipeIcon({ className = "", size = 24 }: PipeIconProps) {
  const width = size * 2.5;
  const height = size;

  return (
    <svg width={width} height={height} viewBox="0 0 60 24" fill="none" className={className}>
      <defs>
        {/* Black HDPE gradient */}
        <linearGradient id="hdpeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3D3D3D" />
          <stop offset="15%" stopColor="#2D2D2D" />
          <stop offset="35%" stopColor="#1F1F1F" />
          <stop offset="50%" stopColor="#151515" />
          <stop offset="70%" stopColor="#101010" />
          <stop offset="85%" stopColor="#0A0A0A" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
        {/* Gradient for the pipe end face */}
        <radialGradient id="hdpeEndGradient" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#404040" />
          <stop offset="50%" stopColor="#252525" />
          <stop offset="100%" stopColor="#101010" />
        </radialGradient>
        {/* Inner hole gradient */}
        <radialGradient id="hdpeInnerGradient" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
      </defs>

      {/* Pipe body - main cylinder */}
      <rect x="8" y="4" width="52" height="16" rx="0" fill="url(#hdpeGradient)" />

      {/* Blue stripe - characteristic HDPE marking */}
      <rect x="8" y="10" width="52" height="3" fill="#00A3D9" />
      <line x1="8" y1="10" x2="60" y2="10" stroke="#00B8F0" strokeWidth="0.5" opacity="0.6" />

      {/* Top highlight line - subtle matte */}
      <line x1="8" y1="5" x2="60" y2="5" stroke="#555555" strokeWidth="1.5" opacity="0.5" />

      {/* Bottom shadow line */}
      <line x1="8" y1="19" x2="60" y2="19" stroke="#000000" strokeWidth="1" opacity="0.6" />

      {/* Pipe end - outer ellipse */}
      <ellipse
        cx="8"
        cy="12"
        rx="4"
        ry="8"
        fill="url(#hdpeEndGradient)"
        stroke="#000000"
        strokeWidth="0.5"
      />

      {/* Blue stripe on end face */}
      <path d="M 4 10 Q 8 9.5 12 10 L 12 13 Q 8 12.5 4 13 Z" fill="#00A3D9" opacity="0.8" />

      {/* Pipe end - wall thickness ring */}
      <ellipse cx="8" cy="12" rx="3" ry="6" fill="none" stroke="#333333" strokeWidth="0.3" />

      {/* Pipe end - inner hole */}
      <ellipse cx="8" cy="12" rx="2" ry="4" fill="url(#hdpeInnerGradient)" />

      {/* Subtle highlight on the end face */}
      <ellipse cx="6" cy="8" rx="0.8" ry="1.5" fill="#FFFFFF" opacity="0.15" />

      {/* Matte reflection on body */}
      <rect x="20" y="5" width="20" height="1.5" rx="0.5" fill="#FFFFFF" opacity="0.08" />
    </svg>
  );
}

export function PipeIcon({ className = "", size = 24 }: PipeIconProps) {
  return <SteelPipeIcon className={className} size={size} />;
}

export default PipeIcon;
