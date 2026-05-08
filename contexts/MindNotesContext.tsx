"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

const USER_ID = "default_user";
const PHOTO_BUCKET = "mind-note-photos";

export interface MindNote {
  id: string;
  text: string | null;
  photo_url: string | null;
  created_at: string;
}

interface MindNotesContextValue {
  notes: MindNote[];
  isLoaded: boolean;
  saveError: string | null;
  addNote: (text: string | null, photoFile?: File) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

const MindNotesContext = createContext<MindNotesContextValue | null>(null);

export function MindNotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<MindNote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("mind_notes")
          .select("*")
          .eq("user_id", USER_ID)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setNotes((data ?? []) as MindNote[]);
      } catch (err) {
        console.error("Mind notes load error:", err);
      } finally {
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const addNote = useCallback(async (text: string | null, photoFile?: File) => {
    setSaveError(null);

    // Optimistic update — note appears immediately while Supabase runs in background
    const tempId = `temp-${Date.now()}`;
    const tempNote: MindNote = {
      id: tempId,
      text: text || null,
      photo_url: null,
      created_at: new Date().toISOString(),
    };
    setNotes((prev) => [tempNote, ...prev]);

    let photo_url: string | null = null;
    if (photoFile) {
      try {
        const path = `${USER_ID}/${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, photoFile, { contentType: photoFile.type });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from(PHOTO_BUCKET)
            .getPublicUrl(path);
          photo_url = urlData.publicUrl;
        } else {
          console.error("Photo upload error:", uploadError.message);
        }
      } catch (err) {
        console.error("Photo upload error:", err);
      }
    }

    const { data, error } = await supabase
      .from("mind_notes")
      .insert({ user_id: USER_ID, text: text || null, photo_url })
      .select()
      .single();

    if (error) {
      console.error("Insert mind note error:", error.message, error.code, error.details);
      // Rollback optimistic note and show error
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
      setSaveError(`Error al guardar: ${error.message}`);
      return;
    }

    // Replace temp note with the persisted one (gets real id + photo_url)
    setNotes((prev) => prev.map((n) => (n.id === tempId ? (data as MindNote) : n)));
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("mind_notes").delete().eq("id", id);
    if (error) console.error("Delete mind note error:", error.message);
  }, []);

  return (
    <MindNotesContext.Provider value={{ notes, isLoaded, saveError, addNote, deleteNote }}>
      {children}
    </MindNotesContext.Provider>
  );
}

export function useMindNotes() {
  const ctx = useContext(MindNotesContext);
  if (!ctx) throw new Error("useMindNotes must be inside MindNotesProvider");
  return ctx;
}
