"use client";

import { useEffect, useState } from "react";
import { getLevelFromXP } from "@/lib/missions";

export default function XPBar({ xp }: { xp: number }) {
  const { level, current, needed } = getLevelFromXP(xp);
  const pct = Math.min((current / needed) * 100, 100);

  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-carbon-soft">level {level}</span>
        <span className="text-xs text-carbon-soft">{current} / {needed} xp</span>
      </div>
      <div className="h-2 bg-cream-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-lavender rounded-full transition-all duration-700 ease-out"
          style={{ width: animated ? `${pct}%` : "0%" }}
        />
      </div>
    </div>
  );
}
