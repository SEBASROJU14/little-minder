"use client";

import { useState } from "react";
import MicButton from "@/components/MicButton";
import { MindNote } from "@/contexts/MindNotesContext";

interface Props {
  onSave: (text: string | null) => Promise<void>;
  notes: MindNote[];
  onClose: () => void;
}

type Phase = "idle" | "searching" | "saved" | "answer";

function detectIntent(text: string): "save" | "search" {
  const lower = text.toLowerCase();
  const searchWords = [
    "dónde", "donde", "cuándo", "cuando", "qué tengo", "que tengo",
    "busca", "encuentra", "hay algo", "tengo apuntado", "cuántos", "cuantos",
    "recuerdas", "qué dijiste", "que dijiste", "qué hay", "que hay",
    "tienes algo", "tengo algo", "qué noté", "que note",
  ];
  const saveWords = [
    "guarda", "recuerda", "anota", "apunta", "agrega", "añade",
    "nota que", "guárdame", "recuérdame", "quiero guardar", "pon que",
  ];
  if (saveWords.some((w) => lower.includes(w))) return "save";
  if (searchWords.some((w) => lower.includes(w))) return "search";
  return "save";
}

export default function SmartMindModal({ onSave, notes, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState("");
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");

  const process = async (transcript: string) => {
    const intent = detectIntent(transcript);

    if (intent === "save") {
      await onSave(transcript);
      setSavedText(transcript);
      setPhase("saved");
      setTimeout(onClose, 3000);
      return;
    }

    console.log(`[SmartMindModal] searching — notes available: ${notes.length}`);
    setPhase("searching");
    try {
      const res = await fetch("/api/mind-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: transcript,
          notes: notes.map((n) => ({
            text: n.text,
            photo_url: n.photo_url,
            created_at: n.created_at,
          })),
        }),
      });
      const data = (await res.json()) as { answer?: string };
      setAnswer(data.answer ?? "No encontré nada 🐱");
    } catch {
      setAnswer("Algo salió mal, inténtalo de nuevo.");
    }
    setPhase("answer");
  };

  const reset = () => { setPhase("idle"); setAnswer(""); setText(""); };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-carbon/25 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-cream rounded-t-3xl px-5 pt-4 pb-10 animate-scale-in">
        <div className="w-10 h-1 bg-cream-dark rounded-full mx-auto mb-5" />

        <h2 className="text-base font-semibold text-carbon mb-1">mind note</h2>
        <p className="text-xs text-carbon-soft/50 mb-6">
          habla para guardar algo o hacer una pregunta — la IA detecta tu intención
        </p>

        {phase === "idle" && (
          <>
            <div className="flex flex-col items-center gap-2 mb-6">
              <MicButton
                endpoint="/api/transcribe-note"
                size="lg"
                onTranscription={process}
              />
              <p className="text-xs text-carbon-soft/40">toca para hablar</p>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="o escribe... («guarda que» o «dónde está»)"
              rows={3}
              className="w-full bg-white rounded-2xl px-4 py-3 text-sm text-carbon placeholder:text-carbon-soft/30 outline-none resize-none shadow-sm focus:ring-2 focus:ring-lavender/40 mb-4"
            />

            <button
              onClick={() => text.trim() && process(text.trim())}
              disabled={!text.trim()}
              className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all duration-150 ${
                text.trim()
                  ? "bg-lavender text-carbon active:scale-[0.98]"
                  : "bg-cream-dark text-carbon-soft cursor-not-allowed"
              }`}
            >
              enviar
            </button>
          </>
        )}

        {phase === "searching" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="w-12 h-12 bg-lavender rounded-full flex items-center justify-center text-2xl shadow-sm">
              🐱
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-lavender border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-carbon-soft">buscando en tus notas…</p>
            </div>
          </div>
        )}

        {phase === "saved" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-12 h-12 bg-moss/10 rounded-full flex items-center justify-center">
              <CheckIcon />
            </div>
            <p className="text-sm font-semibold text-carbon">guardado 🐱</p>
            {savedText && (
              <div className="w-full bg-white rounded-2xl px-4 py-3 shadow-sm">
                <p className="text-sm text-carbon/70 leading-relaxed">{savedText}</p>
              </div>
            )}
          </div>
        )}

        {phase === "answer" && (
          <>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 bg-lavender rounded-full flex items-center justify-center text-xl shrink-0 shadow-sm">
                🐱
              </div>
              <div className="flex-1 bg-lavender-light rounded-2xl rounded-tl-sm px-4 py-4">
                <p className="text-sm text-carbon leading-relaxed">{answer}</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="w-full py-3 rounded-2xl bg-cream-dark text-sm text-carbon-soft font-medium active:scale-[0.98]"
            >
              otra pregunta
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="#6B8F71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
