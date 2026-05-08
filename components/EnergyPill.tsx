import { EnergyLevel } from "@/lib/missions";

const styles: Record<EnergyLevel, string> = {
  low: "bg-rose-soft text-rose-800",
  medium: "bg-lavender-light text-lavender-dark",
  high: "bg-moss-light text-moss-dark",
};

const labels: Record<EnergyLevel, string> = {
  low: "low",
  medium: "medium",
  high: "high",
};

export default function EnergyPill({ level }: { level: EnergyLevel }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}
