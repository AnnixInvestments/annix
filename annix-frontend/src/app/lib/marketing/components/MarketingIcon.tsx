import {
  Activity,
  BadgeCheck,
  Boxes,
  Briefcase,
  Compass,
  Factory,
  FileLock,
  FileUser,
  Flame,
  GitBranch,
  Globe,
  GraduationCap,
  Hammer,
  LayoutDashboard,
  LineChart,
  ListChecks,
  type LucideIcon,
  Map as MapIcon,
  Mic,
  Mountain,
  Orbit,
  Radio,
  Ruler,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";

const ICONS: Record<string, LucideIcon | undefined> = {
  Activity,
  BadgeCheck,
  Boxes,
  Briefcase,
  Compass,
  Factory,
  FileLock,
  FileUser,
  Flame,
  GitBranch,
  Globe,
  GraduationCap,
  Hammer,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Map: MapIcon,
  Mic,
  Mountain,
  Orbit,
  Radio,
  Ruler,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
};

export function MarketingIcon(props: { slot: string; className?: string }) {
  const slot = props.slot;
  const className = props.className ? props.className : "h-6 w-6";
  const found = ICONS[slot];
  const Icon = found ? found : Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
