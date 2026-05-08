"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useApp } from "@/contexts/AppContext";
import { EnergyLevel } from "@/lib/missions";

const energyOptions: { level: EnergyLevel; label: string; desc: string; bg: string }[] = [
  { level: "low",    label: "low",    desc: "tired, taking it easy",  bg: "#F5D4D4" },
  { level: "medium", label: "medium", desc: "okay, going steady",     bg: "#E8E0F5" },
  { level: "high",   label: "high",   desc: "energized and ready",    bg: "#D4E6D6" },
];

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function hasRecentEnergy(): boolean {
  const ts = localStorage.getItem("lm_energy_ts");
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < FOUR_HOURS_MS;
}

export default function EntryPage() {
  const router = useRouter();
  const { setEnergy } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hasRecentEnergy()) {
      // Energy selected < 4h ago — skip screen and restore session flag for home guard
      const saved = localStorage.getItem("lm_energy");
      if (saved) sessionStorage.setItem("lm_session", saved);
      router.replace("/home");
    } else {
      setReady(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (level: EnergyLevel) => {
    localStorage.setItem("lm_energy_ts", Date.now().toString());
    sessionStorage.setItem("lm_session", level);
    setEnergy(level);
    router.push("/home");
  };

  if (!ready) return null;

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 gap-10">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="animate-float">
          <Image
            src="/cat.png"
            alt="Little Minder"
            width={140}
            height={140}
            priority
            className="object-contain drop-shadow-sm"
          />
        </div>
        <div className="text-center">
          <p className="text-carbon text-lg font-semibold">hey there</p>
          <p className="text-carbon-soft text-sm mt-1">how is your energy right now?</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs animate-fade-in">
        {energyOptions.map((opt) => (
          <button
            key={opt.level}
            onClick={() => handleSelect(opt.level)}
            style={{ backgroundColor: opt.bg }}
            className="w-full rounded-2xl px-5 py-4 text-left active:scale-[0.97] transition-transform duration-100"
          >
            <span className="block text-carbon font-semibold text-sm">{opt.label}</span>
            <span className="block text-carbon-soft text-xs mt-0.5">{opt.desc}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-carbon-soft opacity-60">
        no pressure. just check in.
      </p>
    </main>
  );
}
