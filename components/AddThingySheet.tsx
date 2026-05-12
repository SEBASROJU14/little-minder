"use client";

import { useState, useEffect } from "react";
import MicButton from "@/components/MicButton";
import { EnergyLevel, suggestEnergy, Bite } from "@/lib/missions";

interface Props {
  prefillText?: string;
  defaultEnergy?: EnergyLevel;
  prefillIsDaily?: boolean;
  prefillDeadline?: string;
  prefillRequirePhoto?: boolean;
  prefillBites?: Bite[];
  onSave: (
    text: string,
    energy: EnergyLevel,
    opts: { isDaily: boolean; requirePhotoProof: boolean; deadline?: string; bites: Bite[] }
  ) => void;
  onClose: () => void;
  onDelete?: () => void;
}

const ENERGY_COLORS: Record<EnergyLevel, string> = {
  low:    "#F2D0C8",
  medium: "#F0D5D8",
  high:   "#C8D0BB",
};

export default function AddThingySheet({ prefillText, defaultEnergy, prefillIsDaily, prefillDeadline, prefillRequirePhoto, prefillBites, onSave, onClose, onDelete }: Props) {
  const [text, setText] = useState(prefillText ?? "");
  const [energy, setEnergy] = useState<EnergyLevel>(defaultEnergy ?? "medium");
  const [isDaily, setIsDaily] = useState(prefillIsDaily ?? false);
  const [requirePhoto, setRequirePhoto] = useState(prefillRequirePhoto ?? false);
  const [hasDeadline, setHasDeadline] = useState(!!prefillDeadline);
  const [deadline, setDeadline] = useState(prefillDeadline ?? "");
  const [catSuggested, setCatSuggested] = useState(false);
  const [bites, setBites] = useState<Bite[]>(prefillBites ?? []);
  const [newBiteText, setNewBiteText] = useState("");

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

  const handleAddBite = () => {
    const trimmed = newBiteText.trim();
    if (!trimmed || bites.length >= 10) return;
    const bite: Bite = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: trimmed,
      completed: false,
    };
    setBites((prev) => [...prev, bite]);
    setNewBiteText("");
  };

  const handleRemoveBite = (id: string) => {
    setBites((prev) => prev.filter((b) => b.id !== id));
  };

  const handleMoveBite = (idx: number, dir: -1 | 1) => {
    setBites((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed, energy, {
      isDaily,
      requirePhotoProof: requirePhoto,
      deadline: hasDeadline && deadline ? deadline : undefined,
      bites,
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
      <div className="relative w-full max-w-lg bg-cream rounded-t-3xl px-5 pt-4 pb-10 animate-scale-in max-h-[90dvh] overflow-y-auto">
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
        <div className="flex flex-col gap-2 mb-5">
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

        {/* Bites / steps */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-carbon-soft uppercase tracking-wide mb-2.5">bites · pasos</p>

          {bites.map((bite, idx) => (
            <div key={bite.id} className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2.5 shadow-sm mb-1.5">
              <span className="flex-1 text-sm text-carbon leading-snug">{bite.text}</span>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => handleMoveBite(idx, -1)}
                  disabled={idx === 0}
                  className="w-7 h-7 flex items-center justify-center text-carbon-soft/40 hover:text-carbon-soft/70 disabled:opacity-20 active:scale-90 transition-all text-xs"
                >↑</button>
                <button
                  onClick={() => handleMoveBite(idx, 1)}
                  disabled={idx === bites.length - 1}
                  className="w-7 h-7 flex items-center justify-center text-carbon-soft/40 hover:text-carbon-soft/70 disabled:opacity-20 active:scale-90 transition-all text-xs"
                >↓</button>
                <button
                  onClick={() => handleRemoveBite(bite.id)}
                  className="w-7 h-7 flex items-center justify-center text-carbon-soft/30 hover:text-carbon-soft/60 active:scale-90 transition-all text-lg leading-none"
                >×</button>
              </div>
            </div>
          ))}

          {bites.length < 10 && (
            <div className="flex items-center gap-2 mt-2">
              <input
                value={newBiteText}
                onChange={(e) => setNewBiteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddBite()}
                placeholder="agregar paso…"
                className="flex-1 bg-white rounded-2xl px-4 py-2.5 text-sm text-carbon placeholder:text-carbon-soft/40 outline-none shadow-sm border-none"
              />
              <button
                onClick={handleAddBite}
                disabled={!newBiteText.trim()}
                className="w-9 h-9 rounded-full bg-carbon text-white text-base font-light flex items-center justify-center shrink-0 disabled:opacity-25 active:scale-95 transition-transform duration-100"
              >+</button>
            </div>
          )}
          {bites.length >= 10 && (
            <p className="text-[10px] text-carbon-soft/35 mt-1">máx 10 pasos</p>
          )}
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
