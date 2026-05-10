"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { useMindNotes } from "@/contexts/MindNotesContext";
import { supabase } from "@/lib/supabase";
import XPBar from "@/components/XPBar";
import ThingyCard from "@/components/ThingyCard";
import CatCompanion from "@/components/CatCompanion";
import AddThingySheet from "@/components/AddThingySheet";
import ProofModal from "@/components/ProofModal";
import MicButton from "@/components/MicButton";
import MindNoteCard from "@/components/MindNoteCard";
import PhotoPickerSheet from "@/components/PhotoPickerSheet";
import { Thingy, EnergyLevel, isNearDeadline, isPastDeadline } from "@/lib/missions";

// ── Mind Note inline recording ────────────────────────────────────────────────

type MindPhase = "idle" | "recording" | "loading" | "saved" | "answer";

function getMindMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function detectMindIntent(text: string): "save" | "search" {
  const lower = text.toLowerCase();
  const searchWords = [
    "consulta",
    "dónde", "donde", "cuándo", "cuando", "qué tengo", "que tengo",
    "busca", "encuentra", "hay algo", "tengo apuntado", "cuántos", "cuantos",
    "recuerdas", "qué dijiste", "que dijiste", "qué hay", "que hay",
  ];
  const saveWords = [
    "guarda", "recuerda", "anota", "apunta", "agrega", "añade",
    "nota que", "guárdame", "recuérdame", "pon que", "quiero guardar",
  ];
  if (saveWords.some((w) => lower.includes(w))) return "save";
  if (searchWords.some((w) => lower.includes(w))) return "search";
  return "save";
}

// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { energy, xp, thingys, addThingy, updateThingy, completeThingy, isLoaded } = useApp();
  const { notes, addNote, deleteNote, updateNoteText, addPhotoToNote, saveError } = useMindNotes();

  const [mounted, setMounted] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [sheetPrefill, setSheetPrefill] = useState("");
  const [proofTarget, setProofTarget] = useState<Thingy | null>(null);
  const [showDone, setShowDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mind note inline state
  const [mindPhase, setMindPhase] = useState<MindPhase>("idle");
  const [mindAnswer, setMindAnswer] = useState("");
  const [mindSavedText, setMindSavedText] = useState("");
  const [mindSavedNoteId, setMindSavedNoteId] = useState<string | null>(null);
  const [showSavedPhotoSheet, setShowSavedPhotoSheet] = useState(false);
  const savedCameraRef = useRef<HTMLInputElement>(null);
  const savedGalleryRef = useRef<HTMLInputElement>(null);
  const mindRecorderRef = useRef<MediaRecorder | null>(null);
  const mindChunksRef = useRef<Blob[]>([]);
  // Ref so recorder.onstop always sees the latest notes (avoids stale closure)
  const notesRef = useRef(notes);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !isLoaded) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    });
  }, [mounted, isLoaded, router]);

  // ── Mind note processing ────────────────────────────────────────────────────

  const processMindTranscript = async (transcript: string) => {
    const intent = detectMindIntent(transcript);

    if (intent === "save") {
      const noteId = await addNote(transcript);
      setMindSavedNoteId(noteId);
      setMindSavedText(transcript);
      setMindPhase("saved");
      setTimeout(() => { setMindPhase("idle"); setMindSavedNoteId(null); }, 3000);
      return;
    }

    setMindPhase("loading");
    try {
      const currentNotes = notesRef.current;
      const sortedNotes = [...currentNotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      console.log("[mind-search client] notes count:", sortedNotes.length);
      console.log("[mind-search client] created_at values (sorted):", sortedNotes.map((n) => n.created_at));
      console.log("[mind-search client] texts (sorted):", sortedNotes.map((n) => n.text?.slice(0, 40)));
      const res = await fetch("/api/mind-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: transcript,
          notes: sortedNotes.map((n) => ({ text: n.text, photo_url: n.photo_url, created_at: n.created_at })),
        }),
      });
      const data = (await res.json()) as { answer?: string };
      setMindAnswer(data.answer ?? "No encontré nada 🐱");
      setMindPhase("answer");
    } catch {
      setMindPhase("idle");
    }
  };

  const handleMindNotePress = () => {
    if (mindPhase === "recording") {
      mindRecorderRef.current?.stop();
      return;
    }
    if (mindPhase !== "idle") return;

    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mimeType = getMindMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mindRecorderRef.current = recorder;
        mindChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) mindChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(mindChunksRef.current, { type: mimeType || "audio/mp4" });
          mindChunksRef.current = [];
          mindRecorderRef.current = null;

          if (blob.size < 1000) { setMindPhase("idle"); return; }

          const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
          setMindPhase("loading");

          const form = new FormData();
          form.append("audio", blob, `recording.${ext}`);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 25_000);

          fetch("/api/transcribe-note", { method: "POST", body: form, signal: controller.signal })
            .then((r) => r.json() as Promise<{ text?: string }>)
            .then(({ text }) => {
              clearTimeout(timeout);
              if (text?.trim()) {
                void processMindTranscript(text.trim());
              } else {
                setMindPhase("idle");
              }
            })
            .catch(() => { clearTimeout(timeout); setMindPhase("idle"); });
        };

        recorder.start();
        setMindPhase("recording");
      })
      .catch(() => setMindPhase("idle"));
  };

  // ── Thingy handlers ─────────────────────────────────────────────────────────

  const sortPriority = (t: Thingy): number => {
    if (isNearDeadline(t.deadline) || isPastDeadline(t.deadline)) return 0;
    if (t.deadline) return 1;
    if (t.energyLevel === energy) return 2;
    if (t.isDaily) return 3;
    return 4;
  };

  const pending = thingys.filter((t) => !t.completed).sort((a, b) => sortPriority(a) - sortPriority(b));
  const done = thingys.filter((t) => t.completed);

  const handleVoiceTranscription = (text: string) => {
    setSheetPrefill(text);
    setShowSheet(true);
  };

  const handleOpenSheet = () => {
    setSheetPrefill(inputRef.current?.value ?? "");
    setShowSheet(true);
    inputRef.current?.blur();
  };

  const handleSave = (
    text: string,
    lvl: EnergyLevel,
    opts: { isDaily: boolean; requirePhotoProof: boolean; deadline?: string }
  ) => {
    addThingy(text, lvl, opts);
    setShowSheet(false);
    setSheetPrefill("");
  };

  const handleComplete = (thingy: Thingy) => {
    if (thingy.requirePhotoProof) setProofTarget(thingy);
    else completeThingy(thingy.id);
  };

  const handleProofComplete = (msg?: string) => {
    if (!proofTarget) return;
    completeThingy(proofTarget.id, msg);
    setProofTarget(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleDoAgain = (id: string) => {
    const t = thingys.find((x) => x.id === id);
    if (!t) return;
    updateThingy(id, {
      completed: false, progress: 0, completedAt: undefined,
      lastCompletedDate: undefined,
      chunks: t.chunks.map((c) => ({ ...c, completed: false })),
    });
  };

  if (!mounted || !isLoaded) return null;

  return (
    <>
      <main className="min-h-dvh flex flex-col pb-28">

        {/* XP */}
        <header className="px-5 pt-7 pb-3 flex items-center gap-3">
          <div className="flex-1">
            <XPBar xp={xp} />
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="shrink-0 text-carbon-soft/40 hover:text-carbon-soft/70 transition-colors active:scale-90"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </header>

        {/* Two main action buttons */}
        <section className="px-5 pb-4">
          <div className="flex gap-3">
            {/* NEW THINGY — moss green */}
            <div className="flex-1 bg-[#4A5240] rounded-2xl shadow-sm flex items-center overflow-hidden min-h-[60px]">
              <div className="pl-3 pr-1 py-3 shrink-0">
                <MicButton onTranscription={handleVoiceTranscription} />
              </div>
              <button
                onClick={handleOpenSheet}
                className="flex-1 py-3 pr-4 text-left active:bg-black/10 transition-colors"
              >
                <p className="text-sm font-semibold text-white leading-tight">new thingy</p>
                <p className="text-[11px] text-white/55 leading-tight">dicta o escribe</p>
              </button>
            </div>

            {/* MIND NOTE — lavender, records immediately on tap */}
            <button
              onClick={handleMindNotePress}
              disabled={mindPhase === "loading"}
              className={`flex-1 rounded-2xl px-4 flex items-center gap-3 min-h-[60px] shadow-sm transition-all duration-150
                ${mindPhase === "recording"
                  ? "bg-rose-soft scale-[1.02]"
                  : mindPhase === "loading"
                  ? "bg-cream-dark"
                  : mindPhase === "saved"
                  ? "bg-[#4A5240]/20"
                  : "bg-[#F0D5D8] active:scale-[0.98]"
                }`}
            >
              {mindPhase === "idle" && (
                <>
                  <span className="w-9 h-9 bg-white/30 rounded-xl flex items-center justify-center shrink-0">
                    <MicIconSmall />
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-carbon leading-tight">mind note</p>
                    <p className="text-[11px] text-carbon/55 leading-tight">toca para dictar</p>
                  </div>
                </>
              )}
              {mindPhase === "recording" && (
                <>
                  <span className="w-3 h-3 bg-red-500 rounded-sm shrink-0 animate-pulse" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-carbon leading-tight">grabando...</p>
                    <p className="text-[11px] text-carbon/55 leading-tight">toca para detener</p>
                  </div>
                </>
              )}
              {mindPhase === "loading" && (
                <>
                  <span className="w-4 h-4 border-2 border-carbon/30 border-t-carbon/70 rounded-full animate-spin shrink-0" />
                  <p className="text-sm text-carbon/60">procesando...</p>
                </>
              )}
              {mindPhase === "saved" && (
                <>
                  <span className="text-lg shrink-0">🐱</span>
                  <p className="text-sm font-semibold text-[#4A5240] leading-tight">guardado</p>
                </>
              )}
              {mindPhase === "answer" && (
                <>
                  <span className="text-lg shrink-0">🐱</span>
                  <p className="text-sm font-semibold text-carbon leading-tight">respuesta lista</p>
                </>
              )}
            </button>
          </div>

          {/* Saved confirmation */}
          {mindPhase === "saved" && mindSavedText && (
            <div className="mt-2 bg-white rounded-2xl px-4 py-3 shadow-sm">
              <p className="text-xs text-carbon/50 mb-1">guardado 🐱</p>
              <p className="text-sm text-carbon leading-relaxed">{mindSavedText}</p>
              {mindSavedNoteId && (
                <button
                  onClick={() => setShowSavedPhotoSheet(true)}
                  className="mt-2 flex items-center gap-1.5 text-xs text-carbon-soft/50 hover:text-carbon-soft/80 transition-colors active:scale-95"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  agregar foto
                </button>
              )}
              {(() => {
                const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file && mindSavedNoteId) void addPhotoToNote(mindSavedNoteId, file);
                  e.target.value = "";
                };
                return (
                  <>
                    <input ref={savedCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onChange} />
                    <input ref={savedGalleryRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
                  </>
                );
              })()}
              {showSavedPhotoSheet && (
                <PhotoPickerSheet
                  onCamera={() => { setShowSavedPhotoSheet(false); savedCameraRef.current?.click(); }}
                  onGallery={() => { setShowSavedPhotoSheet(false); savedGalleryRef.current?.click(); }}
                  onClose={() => setShowSavedPhotoSheet(false)}
                />
              )}
            </div>
          )}

          {/* AI answer */}
          {mindPhase === "answer" && mindAnswer && (
            <div className="mt-2 bg-lavender-light rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-2 mb-2">
                <span className="shrink-0">🐱</span>
                <p className="text-sm text-carbon leading-relaxed">{mindAnswer}</p>
              </div>
              <button
                onClick={() => { setMindPhase("idle"); setMindAnswer(""); }}
                className="text-xs text-carbon/40 underline"
              >
                cerrar
              </button>
            </div>
          )}
        </section>

        {/* Pending thingys */}
        <section className="px-5 mb-5">
          {pending.length > 0 && (
            <p className="text-xs font-semibold text-carbon-soft/50 uppercase tracking-wider mb-3">
              my thingys · {pending.length}
            </p>
          )}
          {pending.length === 0 && done.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-carbon-soft/50">no thingys yet</p>
              <p className="text-xs text-carbon-soft/35 mt-1">speak or type one above</p>
            </div>
          )}
          {pending.map((t) => (
            <ThingyCard key={t.id} thingy={t} onUpdate={updateThingy} onComplete={handleComplete} />
          ))}
        </section>

        {/* Done section */}
        {done.length > 0 && (
          <section className="px-5 mb-6">
            <button
              onClick={() => setShowDone((v) => !v)}
              className="text-xs font-semibold text-carbon-soft/40 uppercase tracking-wider mb-3 flex items-center gap-2 w-full"
            >
              <span>done · {done.length}</span>
              <span className="text-[10px] mt-px">{showDone ? "▲" : "▼"}</span>
            </button>
            {showDone && (
              <div>
                {done.map((t) => (
                  <ThingyCard
                    key={t.id} thingy={t} onUpdate={updateThingy}
                    onComplete={() => {}} onDoAgain={handleDoAgain}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Mind Notes — always visible */}
        <section className="px-5 mb-6">
          <p className="text-xs font-semibold text-carbon-soft/50 uppercase tracking-wider mb-3">
            mind notes{notes.length > 0 ? ` · ${notes.length}` : ""}
          </p>
          {saveError && (
            <div className="mb-3 px-3 py-2 bg-rose-soft/30 rounded-xl text-xs text-red-700">
              {saveError}
            </div>
          )}
          {notes.length === 0 ? (
            <div className="bg-white/60 rounded-2xl py-7 px-4 text-center">
              <p className="text-sm text-carbon-soft/40">ninguna nota aún</p>
              <p className="text-xs text-carbon-soft/30 mt-1">
                toca <span className="font-medium">mind note</span> arriba para guardar algo
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <MindNoteCard
                key={note.id}
                note={note}
                onDelete={deleteNote}
                onUpdateText={updateNoteText}
                onAddPhoto={addPhotoToNote}
              />
            ))
          )}
        </section>
      </main>

      {/* Cat companion — fixed corner */}
      <CatCompanion energy={energy as EnergyLevel} />

      {/* Add sheet */}
      {showSheet && (
        <AddThingySheet
          prefillText={sheetPrefill || undefined}
          defaultEnergy={energy as EnergyLevel}
          onSave={handleSave}
          onClose={() => { setShowSheet(false); setSheetPrefill(""); }}
        />
      )}

      {/* Proof modal */}
      {proofTarget && (
        <ProofModal
          thingy={proofTarget}
          onComplete={handleProofComplete}
          onSkip={() => { completeThingy(proofTarget!.id); setProofTarget(null); }}
        />
      )}
    </>
  );
}

function MicIconSmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="text-carbon">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
