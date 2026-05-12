"use client";

import { useState } from "react";
import { Thingy, Bite, calcBiteProgress } from "@/lib/missions";

interface Props {
  thingy: Thingy;
  onUpdate: (id: string, updates: Partial<Thingy>) => void;
  onComplete: (thingy: Thingy) => void;
  onEdit: () => void;
  onClose: () => void;
}

export default function ThingyDetailSheet({ thingy, onUpdate, onComplete, onEdit, onClose }: Props) {
  const [bites, setBites] = useState<Bite[]>(thingy.bites);

  const handleToggle = (id: string) => {
    if (thingy.completed) return;
    const updated = bites.map((b) => b.id === id ? { ...b, completed: !b.completed } : b);
    setBites(updated);
    const newProgress = calcBiteProgress(updated);
    onUpdate(thingy.id, { bites: updated, progress: newProgress });
    if (newProgress === 100) {
      setTimeout(() => onComplete({ ...thingy, bites: updated, progress: 100 }), 350);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-carbon/25 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet — misma estructura que AddThingySheet */}
      <div className="relative w-full max-w-lg bg-cream rounded-t-3xl px-5 pt-4 pb-10 animate-scale-in overflow-y-auto" style={{ maxHeight: "90vh", minHeight: "50vh" }}>
        {/* Handle */}
        <div className="w-10 h-1 bg-cream-dark rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5 gap-3">
          <h2 className="text-base font-semibold text-carbon flex-1 leading-snug">{thingy.text}</h2>
          <button
            onClick={onEdit}
            className="shrink-0 text-carbon-soft/40 hover:text-carbon-soft/70 active:scale-90 transition-all text-lg leading-none"
            aria-label="editar"
          >
            ✏️
          </button>
        </div>

        {/* Bites checklist */}
        {bites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <p className="text-sm text-carbon-soft/40">sin pasos aún</p>
            <button
              onClick={onEdit}
              className="text-sm font-medium text-lavender-dark underline underline-offset-2 active:opacity-60"
            >
              agregar pasos
            </button>
          </div>
        ) : (
          <div>
            {bites.map((bite) => (
              <button
                key={bite.id}
                onClick={() => handleToggle(bite.id)}
                disabled={thingy.completed}
                className="flex items-center gap-3 w-full py-3.5 border-b border-cream-dark/60 last:border-b-0 active:bg-cream-dark/40 rounded-xl px-1 transition-colors duration-100"
              >
                <span
                  className={`
                    w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center
                    transition-all duration-200
                    ${bite.completed ? "bg-moss border-moss" : "border-carbon-soft/30 bg-white"}
                  `}
                >
                  {bite.completed && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <polyline
                        points="2,5 4,7.5 8,2.5"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className={`text-sm text-left flex-1 leading-snug transition-all duration-200 ${bite.completed ? "line-through text-carbon-soft/40" : "text-carbon"}`}>
                  {bite.text}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
