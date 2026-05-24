"use client";

interface AnnixSentinelLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light" | "auto";
  showText?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { icon: 34, annix: "text-lg", sentinel: "text-[0.6rem]" },
  md: { icon: 44, annix: "text-2xl", sentinel: "text-[0.7rem]" },
  lg: { icon: 60, annix: "text-3xl", sentinel: "text-[0.85rem]" },
} as const;

const COLOR_CLASS = {
  dark: "text-white",
  light: "text-[#0A1B3D]",
  auto: "text-[#0A1B3D] dark:text-white",
} as const;

function SentinelMark(props: { px: number }) {
  const px = props.px;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 2000 2000"
      width={px}
      height={px}
      role="img"
      aria-label="Annix Sentinel"
      style={{ flexShrink: 0 }}
    >
      <title>Annix Sentinel</title>
      <circle cx="1000" cy="1000" r="760" fill="none" stroke="#1E90FF" strokeWidth="40" />
      <path
        d="M 280 1300 A 760 760 0 0 1 320 640"
        fill="none"
        stroke="#1E90FF"
        strokeWidth="18"
        strokeDasharray="8 46"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M 700 380 L 540 1640 L 640 1640 L 680 1330 L 820 1330 L 860 1640 L 960 1640 L 740 380 Z M 700 1180 L 820 1180 L 760 740 Z"
        fill="#FF8A00"
        fillRule="evenodd"
      />
      <path
        d="M 740 380 C 950 240, 1280 240, 1480 380 C 1580 460, 1620 540, 1600 600 C 1500 540, 1380 520, 1260 540 C 1100 580, 920 620, 780 580 C 720 540, 700 460, 740 380 Z"
        fill="#FF8A00"
      />
      <path
        d="M 1100 380 L 1220 380 L 1440 1370 L 1440 380 L 1560 380 L 1560 1640 L 1440 1640 L 1220 650 L 1220 1640 L 1100 1640 Z"
        fill="currentColor"
      />
      <path
        d="M 1672 540 A 760 760 0 0 1 1672 1460"
        fill="none"
        stroke="#1E90FF"
        strokeWidth="40"
      />
      <circle cx="1580" cy="420" r="70" fill="#FFA500" />
      <circle cx="420" cy="1580" r="44" fill="#1E90FF" />
    </svg>
  );
}

export default function AnnixSentinelLogo(props: AnnixSentinelLogoProps) {
  const { size = "md", variant = "dark", showText = true, className = "" } = props;
  const dims = SIZE_MAP[size];
  const colorClass = COLOR_CLASS[variant];

  if (!showText) {
    return (
      <span className={`inline-flex ${colorClass} ${className}`}>
        <SentinelMark px={dims.icon} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${colorClass} ${className}`}>
      <SentinelMark px={dims.icon} />
      <span className="flex flex-col leading-none">
        <span
          className={`${dims.annix} font-extrabold tracking-[0.12em]`}
          style={{ fontFamily: "var(--font-exo-2), 'Exo 2', system-ui, sans-serif" }}
        >
          ANNI<span style={{ color: "#FF8A00" }}>X</span>
        </span>
        <span
          className={`${dims.sentinel} font-semibold tracking-[0.42em] mt-0.5`}
          style={{
            fontFamily: "var(--font-exo-2), 'Exo 2', system-ui, sans-serif",
            color: "#1E90FF",
          }}
        >
          SENTINEL
        </span>
      </span>
    </span>
  );
}
