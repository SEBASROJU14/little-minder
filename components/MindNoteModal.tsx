"use client";

import { useState, useRef } from "react";
import MicButton from "@/components/MicButton";

interface Props {
  onSave: (text: string | null, photoFile?: File) => Promise<void>;
  onClose: () => void;
}

export default function MindNoteModal({ onSave, onClose }: Props) {
  const [text, setText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!text.trim() && !photoFile) return;
    setSaving(true);
    try {
      await onSave(text.trim() || null, photoFile ?? undefined);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSave = text.trim().length > 0 || !!photoFile;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-carbon/25 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-cream rounded-t-3xl px-5 pt-4 pb-10 animate-scale-in">
        <div className="w-10 h-1 bg-cream-dark rounded-full mx-auto mb-5" />

        <h2 className="text-base font-semibold text-carbon mb-6">nueva nota</h2>

        {/* Voice first — big mic */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <MicButton
            endpoint="/api/transcribe-note"
            size="lg"
            onTranscription={(t) =>
              setText((prev) => (prev ? `${prev} ${t}` : t))
            }
          />
          <p className="text-xs text-carbon-soft/40">toca para dictar</p>
        </div>

        {/* Text fallback */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="o escribe algo..."
          rows={3}
          className="w-full bg-white rounded-2xl px-4 py-3 text-sm text-carbon placeholder:text-carbon-soft/30 outline-none resize-none shadow-sm focus:ring-2 focus:ring-lavender/40 mb-4"
        />

        {/* Photo attach */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl shadow-sm text-sm text-carbon-soft active:bg-cream-dark"
          >
            <CameraIcon />
            <span>{photoFile ? "cambiar foto" : "adjuntar foto"}</span>
          </button>

          {photoPreview && (
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="preview"
                className="w-12 h-12 rounded-xl object-cover shadow-sm"
              />
              <button
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-carbon text-cream rounded-full text-[10px] flex items-center justify-center leading-none"
              >
                ×
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all duration-150 ${
            canSave && !saving
              ? "bg-lavender text-carbon active:scale-[0.98]"
              : "bg-cream-dark text-carbon-soft cursor-not-allowed"
          }`}
        >
          {saving ? "guardando..." : "guardar nota"}
        </button>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
