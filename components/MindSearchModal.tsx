"use client";

import { useState } from "react";
import MicButton from "@/components/MicButton";
import { MindNote } from "@/contexts/MindNotesContext";

interface Props {
  notes: MindNote[];
  onClose: () => void;
}

export default function MindSearchModal({ notes, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/mind-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          notes: notes.map((n) => ({
            text: n.text,
            photo_url: n.photo_url,
            created_at: n.created_at,
          })),
        }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? "No encontré nada 🐱");
    } catch {
      setAnswer("Algo salió mal, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleVoice = (text: string) => {
    setQuery(text);
    search(text);
  };

  const reset = () => {
    setAnswer(null);
    setQuery("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-carbon/25 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-cream rounded-t-3xl px-5 pt-4 pb-12 animate-scale-in">
        <div className="w-10 h-1 bg-cream-dark rounded-full mx-auto mb-5" />

        <h2 className="text-base font-semibold text-carbon mb-1 text-center">
          pregúntale al minder
        </h2>
        <p className="text-xs text-carbon-soft/40 text-center mb-7">
          busca entre todas tus notas
        </p>

        {/* Voice first — big mic. Oculto durante carga y al mostrar respuesta */}
        {!answer && !loading && (
          <div className="flex flex-col items-center gap-2 mb-6">
            <MicButton
              endpoint="/api/transcribe-note"
              size="lg"
              onTranscription={handleVoice}
            />
            <p className="text-xs text-carbon-soft/40">toca para preguntar</p>
          </div>
        )}

        {/* Text fallback */}
        {!answer && !loading && (
          <div className="mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search(query)}
              placeholder="o escribe tu pregunta…"
              className="w-full bg-white rounded-2xl px-4 py-3.5 text-sm text-carbon placeholder:text-carbon-soft/35 outline-none shadow-sm focus:ring-2 focus:ring-lavender/40"
            />
          </div>
        )}

        {/* Search button */}
        {query.trim() && !loading && !answer && (
          <button
            onClick={() => search(query)}
            className="w-full py-3.5 bg-lavender rounded-2xl text-sm font-semibold text-carbon mb-4 active:scale-[0.98]"
          >
            buscar
          </button>
        )}

        {/* Loading — cat pensando */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 bg-lavender rounded-full flex items-center justify-center text-2xl shadow-sm">
              🐱
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-lavender border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-carbon-soft">buscando en tus notas…</p>
            </div>
          </div>
        )}

        {/* Respuesta — estilo gatito */}
        {answer && (
          <div className="animate-fade-in">
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
          </div>
        )}
      </div>
    </div>
  );
}
