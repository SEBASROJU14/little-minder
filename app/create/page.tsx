"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import MicButton from "@/components/MicButton";
import { EnergyLevel } from "@/lib/missions";

const energyOptions: { level: EnergyLevel; label: string; bg: string }[] = [
  { level: "low",    label: "low",    bg: "#F5D4D4" },
  { level: "medium", label: "medium", bg: "#E8E0F5" },
  { level: "high",   label: "high",   bg: "#D4E6D6" },
];

export default function CreatePage() {
  const router = useRouter();
  const { energy, addThingy } = useApp();
  const [text, setText] = useState("");
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel>(
    (energy as EnergyLevel) ?? "medium"
  );
  const [isDaily, setIsDaily] = useState(false);
  const [requirePhoto, setRequirePhoto] = useState(false);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addThingy(trimmed, selectedEnergy, { isDaily, requirePhotoProof: requirePhoto });
    router.back();
  };

  return (
    <main className="min-h-dvh flex flex-col px-5 pt-10 pb-10">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-carbon-soft text-sm mb-8 flex items-center gap-1 w-fit active:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        back
      </button>

      <h1 className="text-xl font-semibold text-carbon mb-1">new thingy</h1>
      <p className="text-sm text-carbon-soft mb-7">keep it small. one thing at a time.</p>

      {/* Text + mic */}
      <div className="flex items-start gap-3 mb-7">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="what's the thingy?"
          rows={3}
          autoFocus
          className="flex-1 bg-white rounded-2xl px-4 py-3 text-sm text-carbon placeholder:text-carbon-soft/50 outline-none resize-none shadow-sm focus:ring-2 focus:ring-lavender/40"
        />
        <MicButton
          onTranscription={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))}
        />
      </div>

      {/* Energy selector */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-carbon-soft uppercase tracking-wide mb-3">energy level</p>
        <div className="flex gap-2">
          {energyOptions.map((opt) => (
            <button
              key={opt.level}
              onClick={() => setSelectedEnergy(opt.level)}
              style={selectedEnergy === opt.level ? { backgroundColor: opt.bg } : {}}
              className={`
                flex-1 py-3 rounded-2xl text-sm font-medium text-carbon transition-all duration-150 active:scale-[0.97]
                ${selectedEnergy === opt.level ? "shadow-sm scale-[1.02]" : "bg-white shadow-sm"}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-3 mb-9">
        <ToggleRow
          label="daily thingy"
          description="resets every day automatically"
          value={isDaily}
          onChange={setIsDaily}
        />
        <ToggleRow
          label="require photo proof"
          description="you'll need a photo to complete it"
          value={requirePhoto}
          onChange={setRequirePhoto}
          icon="📷"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!text.trim()}
        className={`
          w-full py-4 rounded-2xl text-sm font-semibold transition-all duration-150
          ${text.trim()
            ? "bg-carbon text-white active:scale-[0.98]"
            : "bg-cream-dark text-carbon-soft cursor-not-allowed"
          }
        `}
      >
        save thingy
      </button>
    </main>
  );
}

function ToggleRow({
  label, description, value, onChange, icon,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: string;
}) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
      {icon && <span className="text-base opacity-70">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-carbon">{label}</p>
        <p className="text-xs text-carbon-soft/70">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`
          w-11 h-6 rounded-full relative p-0 transition-colors duration-200 shrink-0
          outline-none focus:outline-none
          ${value ? "bg-lavender" : "bg-cream-dark"}
        `}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
            ${value ? "translate-x-[22px]" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}
