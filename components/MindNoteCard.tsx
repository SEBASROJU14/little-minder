"use client";

import { MindNote } from "@/contexts/MindNotesContext";

interface Props {
  note: MindNote;
  onDelete: (id: string) => void;
}

export default function MindNoteCard({ note, onDelete }: Props) {
  const date = new Date(note.created_at).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex gap-3 mb-2 animate-fade-in">
      {note.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={note.photo_url}
          alt=""
          className="w-14 h-14 rounded-xl object-cover shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-carbon-soft/40 mb-1">{date}</p>
        {note.text ? (
          <p className="text-sm text-carbon leading-snug line-clamp-2">{note.text}</p>
        ) : (
          <p className="text-sm text-carbon-soft/35 italic">solo foto</p>
        )}
      </div>
      <button
        onClick={() => onDelete(note.id)}
        className="text-carbon-soft/25 hover:text-carbon-soft/60 shrink-0 self-start text-xl leading-none mt-0.5 transition-colors"
        aria-label="eliminar nota"
      >
        ×
      </button>
    </div>
  );
}
