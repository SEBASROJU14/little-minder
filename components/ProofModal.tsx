"use client";

import { useRef, useState } from "react";
import { Thingy } from "@/lib/missions";

type Stage = "ask" | "capture" | "validating" | "done";

interface Props {
  thingy: Thingy;
  onComplete: (proofMessage?: string) => void;
  onSkip: () => void;
}

const FALLBACKS = [
  "this looks like it counts :)",
  "nice, i think you did it",
  "that works for me",
  "yeah, this counts",
];

export default function ProofModal({ thingy, onComplete, onSkip }: Props) {
  const required = thingy.requirePhotoProof;
  const [stage, setStage] = useState<Stage>("ask");
  const [preview, setPreview] = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      setStage("validating");

      try {
        const base64 = dataUrl.split(",")[1];
        const res = await fetch("/api/validate-proof", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, thingyText: thingy.text }),
        });
        const data = await res.json();
        setValidationMsg(data.message ?? FALLBACKS[0]);
      } catch {
        setValidationMsg(FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]);
      }
      setStage("done");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-carbon/30 backdrop-blur-sm" onClick={!required ? onSkip : undefined} />

      <div className="relative w-full max-w-sm bg-cream rounded-t-3xl p-6 pb-10 animate-scale-in">

        {stage === "ask" && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="w-12 h-12 rounded-full bg-lavender-light flex items-center justify-center text-2xl">
              {required ? "📷" : "🎉"}
            </div>
            <div>
              <p className="font-semibold text-carbon">
                {required ? "one small proof?" : "nice, you did it"}
              </p>
              <p className="text-sm text-carbon-soft mt-1">
                {required
                  ? "snap a quick photo to confirm"
                  : "want to add a small proof?"}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => { setStage("capture"); fileRef.current?.click(); }}
                className="w-full py-3 rounded-2xl bg-lavender text-white font-medium text-sm active:scale-[0.98]"
              >
                add photo
              </button>
              {!required ? (
                <button
                  onClick={onSkip}
                  className="w-full py-3 rounded-2xl text-carbon-soft text-sm font-medium hover:bg-cream-dark active:scale-[0.98]"
                >
                  skip
                </button>
              ) : (
                <button
                  onClick={onSkip}
                  className="text-xs text-carbon-soft/50 underline mt-1"
                >
                  skip this time
                </button>
              )}
            </div>
          </div>
        )}

        {stage === "capture" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-carbon-soft">tap to choose a photo</p>
            <button onClick={onSkip} className="text-xs text-carbon-soft underline">
              skip this
            </button>
          </div>
        )}

        {stage === "validating" && (
          <div className="flex flex-col items-center gap-4 text-center">
            {preview && (
              <div className="w-28 h-28 rounded-2xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="proof" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-carbon-soft">
              <span className="w-4 h-4 border-2 border-lavender border-t-transparent rounded-full animate-spin inline-block" />
              asking the cat...
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="flex flex-col items-center gap-5 text-center">
            {preview && (
              <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="proof" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="bg-white rounded-2xl px-5 py-3">
              <p className="text-sm font-medium text-carbon italic">{validationMsg}</p>
            </div>
            <div className="text-xs text-moss font-medium">+5 bonus xp ✦</div>
            <button
              onClick={() => onComplete(validationMsg)}
              className="w-full py-3 rounded-2xl bg-moss text-white font-medium text-sm active:scale-[0.98]"
            >
              done
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
