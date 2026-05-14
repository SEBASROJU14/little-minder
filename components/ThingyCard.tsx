"use client";

import { useRef, useState } from "react";
import { Thingy, Chunk, EnergyLevel, isNearDeadline, isPastDeadline, formatDeadline, calcChunkProgress, calcBiteProgress } from "@/lib/missions";
import ProgressCircle from "./ProgressCircle";
import EnergyPill from "./EnergyPill";
import AddThingySheet from "./AddThingySheet";
import ThingyDetailSheet from "./ThingyDetailSheet";
import { useMindNotes } from "@/contexts/MindNotesContext";

interface Props {
  thingy: Thingy;
  onUpdate: (id: string, updates: Partial<Thingy>) => void;
  onComplete: (thingy: Thingy) => void;
  onDoAgain?: (id: string) => void;
}

const todayStr = () => new Date().toISOString().split("T")[0];

export default function ThingyCard({ thingy, onUpdate, onComplete, onDoAgain }: Props) {
  const { id, text, energyLevel, completed, progress, isDaily, requirePhotoProof,
    proofMessage, deadline, chunksEnabled, chunks, bites } = thingy;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newChunkText, setNewChunkText] = useState("");

  // ── Tap / Long press ────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const handleCardPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea")) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      longPressTimer.current = null;
      setShowEdit(true);
    }, 500);
  };

  const handleCardPointerUp = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea")) {
      cancelLongPress();
      return;
    }
    if (longPressTimer.current) {
      // Timer still running → tap (< 500ms)
      cancelLongPress();
      setShowDetail(true);
    }
    // If timer is null → long press already fired, do nothing
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // ── Deadline ────────────────────────────────────────────────────────────────

  const nearDeadline = isNearDeadline(deadline);
  const pastDeadline = isPastDeadline(deadline);

  const hasBites = bites.length > 0;
  const displayProgress = hasBites
    ? calcBiteProgress(bites)
    : chunksEnabled && chunks.length > 0
    ? calcChunkProgress(chunks)
    : progress;

  // --- progress handlers ---

  const handleManualProgress = (next: number) => {
    if (chunksEnabled || hasBites) return;
    if (next === 100) {
      onComplete(thingy);
    } else {
      onUpdate(id, { progress: next });
    }
  };

  // --- chunk handlers ---

  const handleChunkToggle = (chunkId: string) => {
    if (completed) return;
    const updated = chunks.map((c) =>
      c.id === chunkId ? { ...c, completed: !c.completed } : c
    );
    const newProgress = calcChunkProgress(updated);
    onUpdate(id, { chunks: updated, progress: newProgress });
    if (newProgress === 100) {
      setTimeout(() => onComplete({ ...thingy, chunks: updated, progress: 100 }), 350);
    }
  };

  const handleAddChunk = () => {
    const trimmed = newChunkText.trim();
    if (!trimmed || chunks.length >= 10) return;
    const newChunk: Chunk = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: trimmed,
      completed: false,
    };
    onUpdate(id, { chunks: [...chunks, newChunk] });
    setNewChunkText("");
  };

  const handleToggleChunks = () => {
    if (completed) return;
    const enabling = !chunksEnabled;
    onUpdate(id, {
      chunksEnabled: enabling,
      chunks: enabling ? chunks : [],
      progress: enabling ? calcChunkProgress(chunks) : 0,
    });
  };

  // --- attribute handlers ---

  const toggleDaily = () => onUpdate(id, { isDaily: !isDaily });
  const togglePhoto = () => onUpdate(id, { requirePhotoProof: !requirePhotoProof });

  const handleDeadlineTap = () => {
    if (deadline) {
      onUpdate(id, { deadline: undefined });
      setShowDatePicker(false);
    } else {
      setShowDatePicker((v) => !v);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      onUpdate(id, { deadline: val });
      setShowDatePicker(false);
    }
  };

  return (
    <>
    <div
      className="rounded-3xl px-4 py-3 mb-2 animate-fade-in select-none"
      style={
        nearDeadline
          ? { background: "linear-gradient(150deg,#EDD9B5 0%,#E3CDA3 100%)", boxShadow: "0 0 0 2px rgba(251,191,36,0.5), 0 2px 8px rgba(44,36,22,0.13)" }
          : pastDeadline && !completed
          ? { background: "linear-gradient(150deg,#EDD9B5 0%,#E3CDA3 100%)", boxShadow: "0 0 0 2px rgba(239,68,68,0.25), 0 2px 8px rgba(44,36,22,0.13)" }
          : { background: "linear-gradient(150deg,#EDD9B5 0%,#E3CDA3 100%)", boxShadow: "0 2px 8px rgba(44,36,22,0.12), 0 1px 2px rgba(44,36,22,0.06)" }
      }
      onPointerDown={handleCardPointerDown}
      onPointerUp={handleCardPointerUp}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
    >
      <div className="flex items-start gap-3">
        {/* Progress circle — read-only when chunks or bites active */}
        <div className="mt-0.5">
          <ProgressCircle
            progress={displayProgress}
            onProgress={completed || chunksEnabled || hasBites ? undefined : handleManualProgress}
            readonly={completed || chunksEnabled || hasBites}
            size={44}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className={`text-sm font-medium leading-snug flex-1 ${completed ? "line-through text-carbon-soft/60" : "text-carbon"}`}>
              {text}
            </p>
            <EnergyPill level={energyLevel as EnergyLevel} />
          </div>

          {proofMessage && (
            <p className="text-xs text-moss italic mt-1">{proofMessage}</p>
          )}

          {/* Bites summary — shown when bites exist */}
          {hasBites && !completed && (
            <p className="text-[11px] text-carbon-soft/50 mt-1">
              {bites.filter((b) => b.completed).length}/{bites.length} pasos
            </p>
          )}

          {/* Attribute pills */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <AttributePill
              active={isDaily}
              activeStyle="bg-amber-soft text-amber-700"
              inactiveStyle="text-carbon-soft/35"
              onClick={toggleDaily}
              label={isDaily ? "♻ daily" : "♻"}
              title="toggle daily"
            />
            <AttributePill
              active={!!deadline}
              activeStyle={
                nearDeadline ? "bg-amber-200 text-amber-800" :
                pastDeadline ? "bg-rose-soft text-rose-700" :
                "bg-cream-dark text-carbon-soft"
              }
              inactiveStyle="text-carbon-soft/35"
              onClick={handleDeadlineTap}
              label={deadline ? `🔔 ${formatDeadline(deadline)}` : "🔔"}
              title={deadline ? "tap to remove deadline" : "tap to set deadline"}
            />
            <AttributePill
              active={requirePhotoProof}
              activeStyle="bg-lavender-light text-lavender-dark"
              inactiveStyle="text-carbon-soft/35"
              onClick={togglePhoto}
              label={requirePhotoProof ? "📷 on" : "📷"}
              title="toggle photo proof"
            />
            {!completed && !hasBites && (
              <AttributePill
                active={chunksEnabled}
                activeStyle="bg-lavender-light text-lavender-dark"
                inactiveStyle="text-carbon-soft/35"
                onClick={handleToggleChunks}
                label={chunksEnabled ? `≡ ${chunks.filter(c=>c.completed).length}/${chunks.length}` : "≡"}
                title="toggle steps/chunks"
              />
            )}
            {!completed && <ThingyNoteButton thingyId={id} />}
          </div>

          {/* Inline date picker */}
          {showDatePicker && (
            <input
              type="date"
              min={todayStr()}
              autoFocus
              onChange={handleDateChange}
              className="mt-2 bg-cream-dark rounded-xl px-3 py-1.5 text-xs text-carbon outline-none border-none w-full"
              onBlur={() => setShowDatePicker(false)}
            />
          )}

          {/* Chunks section */}
          {chunksEnabled && !hasBites && (
            <div className="mt-3 pt-3 border-t border-cream-dark/80">
              {chunks.length === 0 && (
                <p className="text-xs text-carbon-soft/40 mb-2">add steps below</p>
              )}

              {chunks.map((chunk) => (
                <div key={chunk.id} className="flex items-center gap-2 py-1.5">
                  <button
                    onClick={() => handleChunkToggle(chunk.id)}
                    disabled={completed}
                    className={`
                      w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center
                      transition-all duration-200 active:scale-90
                      ${chunk.completed
                        ? "bg-moss border-moss"
                        : "border-carbon-soft/30 bg-white"}
                    `}
                  >
                    {chunk.completed && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <polyline
                          points="2,5 4,7.5 8,2.5"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`text-xs flex-1 transition-all duration-200 leading-snug
                      ${chunk.completed ? "line-through text-carbon-soft/40" : "text-carbon"}`}
                  >
                    {chunk.text}
                  </span>
                </div>
              ))}

              {/* Add chunk input */}
              {!completed && chunks.length < 10 && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    value={newChunkText}
                    onChange={(e) => setNewChunkText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddChunk()}
                    placeholder="add a step…"
                    className="flex-1 text-xs bg-cream-dark rounded-xl px-3 py-2 outline-none text-carbon placeholder:text-carbon-soft/35 border-none"
                  />
                  <button
                    onClick={handleAddChunk}
                    disabled={!newChunkText.trim()}
                    className="w-7 h-7 rounded-full bg-carbon text-white text-base font-light flex items-center justify-center shrink-0 disabled:opacity-25 active:scale-95 transition-transform duration-100"
                  >
                    +
                  </button>
                </div>
              )}

              {chunks.length === 10 && (
                <p className="text-[10px] text-carbon-soft/35 mt-1">max 10 steps</p>
              )}
            </div>
          )}

          {/* Do again button — only for completed thingys */}
          {completed && onDoAgain && (
            <button
              onClick={() => onDoAgain(id)}
              className="mt-2 text-[11px] text-carbon-soft/50 underline underline-offset-2 active:opacity-60 transition-opacity"
            >
              do again
            </button>
          )}
        </div>
      </div>

    </div>

    {/* Modals outside the animated div (stacking context fix) */}
    {showDetail && (
      <ThingyDetailSheet
        thingy={thingy}
        onUpdate={onUpdate}
        onComplete={onComplete}
        onEdit={() => { setShowDetail(false); setShowEdit(true); }}
        onClose={() => setShowDetail(false)}
      />
    )}

    {showEdit && (
      <AddThingySheet
        prefillText={text}
        defaultEnergy={energyLevel as EnergyLevel}
        prefillIsDaily={isDaily}
        prefillDeadline={deadline}
        prefillRequirePhoto={requirePhotoProof}
        prefillBites={bites}
        onSave={(newText, newEnergy, opts) => {
          onUpdate(id, {
            text: newText,
            energyLevel: newEnergy,
            isDaily: opts.isDaily,
            requirePhotoProof: opts.requirePhotoProof,
            deadline: opts.deadline,
            bites: opts.bites,
          });
          setShowEdit(false);
        }}
        onClose={() => setShowEdit(false)}
        onDelete={() => setShowDeleteConfirm(true)}
      />
    )}

    {showDeleteConfirm && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center px-6"
        onClick={() => setShowDeleteConfirm(false)}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="relative bg-white rounded-2xl px-5 py-5 w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-carbon mb-1">
            ¿Seguro que quieres eliminar este thingy?
          </p>
          <p className="text-xs text-carbon-soft/50 mb-5 line-clamp-2">{text}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-3 rounded-2xl bg-cream-dark text-sm font-medium text-carbon active:scale-95 transition-transform"
            >
              Cancelar
            </button>
            <button
              onClick={() => { setShowDeleteConfirm(false); setShowEdit(false); onComplete(thingy); }}
              className="flex-1 py-3 rounded-2xl bg-carbon text-sm font-medium text-white active:scale-95 transition-transform"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function AttributePill({
  active, activeStyle, inactiveStyle, onClick, label, title,
}: {
  active: boolean;
  activeStyle: string;
  inactiveStyle: string;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
        transition-all duration-150 active:scale-95
        ${active ? activeStyle : inactiveStyle}
      `}
    >
      {label}
    </button>
  );
}

function getMindMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function ThingyNoteButton({ thingyId }: { thingyId: string }) {
  const { addNote } = useMindNotes();
  const [state, setState] = useState<"idle" | "recording" | "loading" | "saved">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handlePress = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (state === "recording") {
      recorderRef.current?.stop();
      return;
    }
    if (state !== "idle") return;

    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mimeType = getMindMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/mp4" });
        chunksRef.current = [];
        recorderRef.current = null;

        if (blob.size < 1000) { setState("idle"); return; }

        const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
        setState("loading");

        const form = new FormData();
        form.append("audio", blob, `recording.${ext}`);

        fetch("/api/transcribe-note", { method: "POST", body: form })
          .then((r) => r.json() as Promise<{ text?: string }>)
          .then(async ({ text }) => {
            if (text?.trim()) {
              await addNote(text.trim(), undefined, thingyId);
              setState("saved");
              setTimeout(() => setState("idle"), 2500);
            } else {
              setState("idle");
            }
          })
          .catch(() => setState("idle"));
      };

      recorder.start();
      setState("recording");
    }).catch(() => setState("idle"));
  };

  return (
    <button
      onClick={handlePress}
      disabled={state === "loading"}
      title="agregar nota de voz"
      className={`
        inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium
        transition-all duration-150 active:scale-95
        ${state === "recording" ? "bg-rose-soft text-red-600" :
          state === "loading" ? "text-carbon-soft/35 cursor-wait" :
          state === "saved" ? "bg-[#4A5240]/10 text-[#4A5240]" :
          "text-carbon-soft/35"}
      `}
    >
      {state === "idle" && "🎙"}
      {state === "recording" && <><span className="w-1.5 h-1.5 bg-red-500 rounded-sm animate-pulse" /><span>detener</span></>}
      {state === "loading" && <span className="w-3 h-3 border border-carbon-soft/40 border-t-carbon rounded-full animate-spin" />}
      {state === "saved" && "📎 guardado"}
    </button>
  );
}
