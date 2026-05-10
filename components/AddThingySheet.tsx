"use client";

import { useState, useEffect } from "react";
import MicButton from "@/components/MicButton";
import { EnergyLevel, suggestEnergy } from "@/lib/missions";

interface Props {
  prefillText?: string;
  defaultEnergy?: EnergyLevel;
  prefillIsDaily?: boolean;
  prefillDeadline?: string;
  prefillRequirePhoto?: boolean;
  onSave: (
    text: string,
    energy: EnergyLevel,
    opts: { isDaily: boolean; requirePhotoProof: boolean; deadline?: string }
  ) => void;
  onClose: () => void;
  onDelete?: () => void;
}

const ENERGY_COLORS: Record<EnergyLevel, string> = {
  low:    "#F2D0C8",
  medium: "#F0D5D8",
  high:   "#C8D0BB",
};

export default function AddThingySheet({ prefillText, defaultEnergy, prefillIsDaily, prefillDeadline, prefillRequirePhoto, onSave, onClose, onDelete }: Props) {
  const [text, setText] = useState(prefillText ?? "");
  const [energy, setEnergy] = useState<EnergyLevel>(defaultEnergy ?? "medium");
  const [isDaily, setIsDaily] = useState(prefillIsDaily ?? false);
  const [requirePhoto, setRequirePhoto] = useState(prefillRequirePhoto ?? false);
  const [hasDeadline, setHasDeadline] = useState(!!prefillDeadline);
  const [deadline, setDeadline] = useState(prefillDeadline ?? "");
  const [catSuggested, setCatSuggested] = useState(false);

  // If prefill text arrives in add mode, auto-suggest energy
  useEffect(() => {
    if (prefillText && !onDelete) {
      const s = suggestEnergy(prefillText);
      setEnergy(s);
      setCatSuggested(true);
      const t = setTimeout(() => setCatSuggested(false), 2500);
      return () => clearTimeout(t);
    }
  }, [prefillText, onDelete]);

  const handleAskCat = () => {
    if (!text.trim()) return;
    const s = suggestEnergy(text);
    setEnergy(s);
    setCatSuggested(true);
    setTimeout(() => setCatSuggested(false), 2500);
  };

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed, energy, {
      isDaily,
      requirePhotoProof: requirePhoto,
      deadline: hasDeadline && deadline ? deadline : undefined,
    });
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-carbon/25 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-cream rounded-t-3xl px-5 pt-4 pb-10 animate-scale-in">
        {/* Handle */}
        <div className="w-10 h-1 bg-cream-dark rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-carbon">{onDelete ? "editar thingy" : "new thingy"}</h2>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-carbon-soft/30 hover:text-carbon-soft/60 active:scale-90 transition-all text-lg leading-none"
              aria-label="eliminar thingy"
            >
              🗑️
            </button>
          )}
        </div>

        {/* Voice + text */}
        <div className="flex items-start gap-3 mb-5">
          <MicButton
            onTranscription={(t) => {
              setText((prev) => (prev ? `${prev} ${t}` : t));
              const s = suggestEnergy(t);
              setEnergy(s);
              setCatSuggested(true);
              setTimeout(() => setCatSuggested(false), 2500);
            }}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="what's the thingy?"
            rows={2}
            autoFocus
            className="flex-1 bg-white rounded-2xl px-4 py-3 text-sm text-carbon placeholder:text-carbon-soft/40 outline-none resize-none shadow-sm focus:ring-2 focus:ring-lavender/40"
          />
        </div>

        {/* Energy */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <p className="text-xs font-semibold text-carbon-soft uppercase tracking-wide">energy</p>
            <button
              onClick={handleAskCat}
              className="text-xs text-lavender-dark underline active:opacity-60"
            >
              ask the cat
            </button>
            {catSuggested && (
              <span className="text-xs text-moss animate-fade-in">✓ suggested</span>
            )}
          </div>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as EnergyLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setEnergy(lvl)}
                style={energy === lvl ? { backgroundColor: ENERGY_COLORS[lvl] } : {}}
                className={`
                  flex-1 py-2.5 rounded-2xl text-sm font-medium text-carbon
                  transition-all duration-150 active:scale-[0.97]
                  ${energy === lvl ? "scale-[1.02] shadow-sm" : "bg-white shadow-sm"}
                `}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-2 mb-6">
          <SheetToggle
            label="daily — resets every day"
            value={isDaily}
            onChange={setIsDaily}
          />
          <div>
            <SheetToggle
              label="deadline"
              value={hasDeadline}
              onChange={(v) => { setHasDeadline(v); if (!v) setDeadline(""); }}
            />
            {hasDeadline && (
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={todayStr}
                className="mt-2 w-full bg-white rounded-2xl px-4 py-2.5 text-sm text-carbon shadow-sm outline-none border-none"
              />
            )}
          </div>
          <SheetToggle
            label="📷  require photo proof"
            value={requirePhoto}
            onChange={setRequirePhoto}
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
          {onDelete ? "guardar" : "add thingy"}
        </button>
      </div>
    </div>
  );
}

function SheetToggle({
  label, value, onChange,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
      <p className="text-sm font-medium text-carbon">{label}</p>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full relative p-0 transition-colors duration-200 shrink-0 outline-none focus:outline-none ${value ? "bg-lavender" : "bg-cream-dark"}`}
        role="switch"
        aria-checked={value}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${value ? "translate-x-[22px]" : "translate-x-0"}`} />
      </button>
    </div>
  );
}
