"use client";

import { Thingy } from "@/lib/missions";
import EnergyPill from "./EnergyPill";

interface Props {
  thingy: Thingy;
  onComplete: (thingy: Thingy) => void;
  animateIn?: boolean;
}

export default function ThingyCard({ thingy, onComplete, animateIn }: Props) {
  return (
    <div
      className={`
        bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm
        ${animateIn ? "animate-fade-in" : ""}
        ${thingy.completed ? "opacity-50" : ""}
      `}
    >
      <button
        onClick={() => !thingy.completed && onComplete(thingy)}
        className={`
          w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0
          transition-all duration-200 active:scale-90
          ${thingy.completed
            ? "bg-moss border-moss text-white"
            : "border-lavender hover:border-lavender-dark hover:bg-lavender-light"
          }
        `}
        aria-label="complete thingy"
        disabled={thingy.completed}
      >
        {thingy.completed && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${thingy.completed ? "line-through" : "text-carbon"}`}>
          {thingy.text}
        </p>
        {thingy.proofMessage && (
          <p className="text-xs text-moss mt-0.5 italic">{thingy.proofMessage}</p>
        )}
      </div>

      <EnergyPill level={thingy.energyLevel} />
    </div>
  );
}
