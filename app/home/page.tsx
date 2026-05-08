"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { useMindNotes } from "@/contexts/MindNotesContext";
import XPBar from "@/components/XPBar";
import ThingyCard from "@/components/ThingyCard";
import CatCompanion from "@/components/CatCompanion";
import AddThingySheet from "@/components/AddThingySheet";
import ProofModal from "@/components/ProofModal";
import MicButton from "@/components/MicButton";
import MindNoteCard from "@/components/MindNoteCard";
import MindNoteModal from "@/components/MindNoteModal";
import MindSearchModal from "@/components/MindSearchModal";
import { Thingy, EnergyLevel, isNearDeadline, isPastDeadline } from "@/lib/missions";

export default function HomePage() {
  const router = useRouter();
  const { energy, xp, thingys, addThingy, updateThingy, completeThingy, isLoaded } = useApp();
  const { notes, addNote, deleteNote } = useMindNotes();

  const [mounted, setMounted] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [sheetPrefill, setSheetPrefill] = useState("");
  const [proofTarget, setProofTarget] = useState<Thingy | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [showMindNoteModal, setShowMindNoteModal] = useState(false);
  const [showMindSearch, setShowMindSearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mark as mounted so SSR and initial client render match (both return null)
  useEffect(() => setMounted(true), []);

  // Redirect if no energy selected this session
  useEffect(() => {
    if (!mounted || !isLoaded) return;
    if (!sessionStorage.getItem("lm_session")) router.replace("/");
  }, [mounted, isLoaded, router]);

  const sortPriority = (t: Thingy): number => {
    if (isNearDeadline(t.deadline) || isPastDeadline(t.deadline)) return 0; // deadline urgente
    if (t.deadline) return 1;                                                // cualquier deadline
    if (t.energyLevel === energy) return 2;                                  // coincide energía
    if (t.isDaily) return 3;                                                 // daily sin deadline
    return 4;                                                                // todo lo demás
  };

  const pending = thingys
    .filter((t) => !t.completed)
    .sort((a, b) => sortPriority(a) - sortPriority(b));

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
    if (thingy.requirePhotoProof) {
      setProofTarget(thingy);
    } else {
      completeThingy(thingy.id);
    }
  };

  const handleProofComplete = (msg?: string) => {
    if (!proofTarget) return;
    completeThingy(proofTarget.id, msg);
    setProofTarget(null);
  };

  const handleDoAgain = (id: string) => {
    const t = thingys.find((x) => x.id === id);
    if (!t) return;
    updateThingy(id, {
      completed: false,
      progress: 0,
      completedAt: undefined,
      lastCompletedDate: undefined,
      chunks: t.chunks.map((c) => ({ ...c, completed: false })),
    });
  };

  // Both server and initial client render return null — eliminates hydration mismatch
  if (!mounted || !isLoaded) return null;

  return (
    <>
      <main className="min-h-dvh flex flex-col pb-28">

        {/* XP */}
        <header className="px-5 pt-7 pb-3">
          <XPBar xp={xp} />
        </header>

        {/* Add thingy row — voice first */}
        <section className="px-5 pb-3">
          <div className="flex items-center gap-2">
            <MicButton onTranscription={handleVoiceTranscription} />
            <button
              onClick={handleOpenSheet}
              className="flex-1 bg-white rounded-2xl px-4 py-3.5 text-left shadow-sm text-carbon-soft/40 text-sm active:bg-cream-dark transition-colors"
            >
              what&apos;s the thingy?
            </button>
          </div>
        </section>

        {/* Mind note — quick add + search, always visible */}
        <section className="px-5 pb-5">
          <div className="flex gap-2">
            <button
              onClick={() => setShowMindNoteModal(true)}
              className="flex-1 bg-moss-light rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] shadow-sm"
            >
              <span className="w-9 h-9 bg-moss/20 rounded-xl flex items-center justify-center shrink-0">
                <NoteIcon />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-moss-dark leading-tight">mind note</p>
                <p className="text-[11px] text-moss-dark/55 leading-tight">captura un pensamiento</p>
              </div>
            </button>

            <button
              onClick={() => setShowMindSearch(true)}
              className="w-14 h-14 bg-lavender-light rounded-2xl flex items-center justify-center shadow-sm active:bg-lavender shrink-0"
              aria-label="buscar en notas"
            >
              <SearchIcon />
            </button>
          </div>
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
            <ThingyCard
              key={t.id}
              thingy={t}
              onUpdate={updateThingy}
              onComplete={handleComplete}
            />
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
                    key={t.id}
                    thingy={t}
                    onUpdate={updateThingy}
                    onComplete={() => {}}
                    onDoAgain={handleDoAgain}
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
          {notes.length === 0 ? (
            <div className="bg-white/60 rounded-2xl py-7 px-4 text-center">
              <p className="text-sm text-carbon-soft/40">ninguna nota aún</p>
              <p className="text-xs text-carbon-soft/30 mt-1">
                toca <span className="font-medium">mind note</span> arriba para guardar algo
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <MindNoteCard key={note.id} note={note} onDelete={deleteNote} />
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

      {/* Mind note modal */}
      {showMindNoteModal && (
        <MindNoteModal
          onSave={addNote}
          onClose={() => setShowMindNoteModal(false)}
        />
      )}

      {/* Mind search modal */}
      {showMindSearch && (
        <MindSearchModal
          notes={notes}
          onClose={() => setShowMindSearch(false)}
        />
      )}
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-moss">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
