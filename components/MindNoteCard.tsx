"use client";

import { useRef, useState } from "react";
import { MindNote } from "@/contexts/MindNotesContext";
import PhotoPickerSheet from "@/components/PhotoPickerSheet";

interface Props {
  note: MindNote;
  onDelete: (id: string) => void;
  onUpdateText: (id: string, text: string) => Promise<void>;
  onAddPhoto: (id: string, file: File) => Promise<void>;
}

export default function MindNoteCard({ note, onDelete, onUpdateText, onAddPhoto }: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(note.text ?? "");
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const date = new Date(note.created_at).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });

  // ── Long press to edit ──────────────────────────────────────────────────────

  const handlePointerDown = () => {
    if (editing) return;
    longPressTimer.current = setTimeout(() => {
      setEditText(note.text ?? "");
      setEditing(true);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleBlur = () => {
    setEditing(false);
    const trimmed = editText.trim();
    if (trimmed !== (note.text ?? "").trim()) {
      void onUpdateText(note.id, trimmed);
    }
  };

  // ── Photo ───────────────────────────────────────────────────────────────────

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void onAddPhoto(note.id, file);
    setShowPhotoSheet(false);
    e.target.value = "";
  };

  const handlePickPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPhotoSheet(true);
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm px-4 py-3 flex gap-3 mb-2 animate-fade-in select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-carbon-soft/40 mb-1">{date}</p>

        {editing ? (
          <textarea
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
            rows={2}
            className="w-full text-sm text-carbon leading-snug bg-cream-dark rounded-xl px-2 py-1.5 outline-none resize-none border-none"
          />
        ) : note.text ? (
          <p className="text-sm text-carbon leading-snug line-clamp-2">{note.text}</p>
        ) : (
          <p className="text-sm text-carbon-soft/35 italic">solo foto</p>
        )}

        {note.photo_url && !editing && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setFullscreen(true); }}
            className="mt-1.5 text-base leading-none active:scale-95 transition-transform"
            aria-label="ver foto"
          >
            📷
          </button>
        )}

        {/* Add photo button — only when note has no photo yet */}
        {!note.photo_url && !editing && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handlePickPhoto}
            className="mt-1.5 flex items-center gap-1 text-[11px] text-carbon-soft/40 hover:text-carbon-soft/70 transition-colors active:scale-95"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            agregar foto
          </button>
        )}
      </div>

      <div className="flex flex-col items-end justify-between shrink-0">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          className="text-carbon-soft/25 hover:text-carbon-soft/60 text-xl leading-none mt-0.5 transition-colors"
          aria-label="eliminar nota"
        >
          ×
        </button>
      </div>

      {fullscreen && note.photo_url && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setFullscreen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={note.photo_url} alt="" className="max-w-[90vw] max-h-[85vh] rounded-xl" />
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-5 right-5 w-9 h-9 bg-white/15 rounded-full flex items-center justify-center text-white text-xl leading-none"
            aria-label="cerrar"
          >
            ×
          </button>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

      {showPhotoSheet && (
        <PhotoPickerSheet
          onCamera={() => { setShowPhotoSheet(false); cameraRef.current?.click(); }}
          onGallery={() => { setShowPhotoSheet(false); galleryRef.current?.click(); }}
          onClose={() => setShowPhotoSheet(false)}
        />
      )}
    </div>
  );
}
