import { Package as PackageGlyph, type LucideProps } from "lucide-react";

export function Package(props: Omit<LucideProps, "className">) {
  return (
    <PackageGlyph className="mb-4 text-[var(--paint-signal)]" {...props} />
  );
}

export {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  Compass,
  Cpu,
  Download,
  Home,
  LockKeyhole,
  Plus,
  Radio,
  Shield,
  ThumbsDown,
  UserRound,
  X,
} from "lucide-react";
