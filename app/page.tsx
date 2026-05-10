"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useApp } from "@/contexts/AppContext";
import { EnergyLevel } from "@/lib/missions";
import { supabase } from "@/lib/supabase";

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

type Phase = "loading" | "login" | "energy";

export default function EntryPage() {
  const router = useRouter();
  const { setEnergy } = useApp();
  const [phase, setPhase] = useState<Phase>("loading");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setPhase("login");
        return;
      }
      if (hasRecentEnergy()) {
        const saved = localStorage.getItem("lm_energy");
        if (saved) sessionStorage.setItem("lm_session", saved);
        router.replace("/home");
      } else {
        setPhase("energy");
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // Browser navigates away — no need to reset signingIn
  };

  const handleSelect = (level: EnergyLevel) => {
    localStorage.setItem("lm_energy_ts", Date.now().toString());
    sessionStorage.setItem("lm_session", level);
    setEnergy(level);
    router.push("/home");
  };

  if (phase === "loading") return null;

  if (phase === "login") {
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
            <p className="text-carbon text-lg font-semibold">little minder</p>
            <p className="text-carbon-soft text-sm mt-1">sign in to get started</p>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm active:scale-[0.97] transition-transform duration-100 disabled:opacity-60"
        >
          <GoogleIcon />
          <span className="text-carbon font-semibold text-sm">
            {signingIn ? "redirecting..." : "continue with Google"}
          </span>
        </button>
      </main>
    );
  }

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
