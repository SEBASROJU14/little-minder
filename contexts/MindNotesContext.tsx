"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

const PHOTO_BUCKET = "mind-note-photos";

export interface MindNote {
  id: string;
  text: string | null;
  photo_url: string | null;
  created_at: string;
  thingy_id: string | null;
}

interface MindNotesContextValue {
  notes: MindNote[];
  isLoaded: boolean;
  saveError: string | null;
  addNote: (text: string | null, photoFile?: File, thingyId?: string) => Promise<string | null>;
  deleteNote: (id: string) => Promise<void>;
  updateNoteText: (id: string, text: string) => Promise<void>;
  addPhotoToNote: (id: string, file: File) => Promise<void>;
}

const MindNotesContext = createContext<MindNotesContextValue | null>(null);

export function MindNotesProvider({ children }: { children: ReactNode }) {
  const userIdRef = useRef<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [notes, setNotes] = useState<MindNote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Resolve authenticated user ID and stay in sync with auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? null;
      userIdRef.current = id;
      setUserId(id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      userIdRef.current = id;
      setUserId(id);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function load() {
      try {
        const { data, error } = await supabase
          .from("mind_notes")
          .select("*")
          .eq("user_id", userId)
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
  }, [userId]);

  // Returns the real note ID on success, null on failure
  const addNote = useCallback(async (text: string | null, photoFile?: File, thingyId?: string): Promise<string | null> => {
    setSaveError(null);

    // Optimistic update — note appears immediately while Supabase runs in background
    const tempId = `temp-${Date.now()}`;
    const tempNote: MindNote = {
      id: tempId,
      text: text || null,
      photo_url: null,
      created_at: new Date().toISOString(),
      thingy_id: thingyId ?? null,
    };
    setNotes((prev) => [tempNote, ...prev]);

    const uid = userIdRef.current;
    if (!uid) {
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
      setSaveError("Error al guardar, intenta de nuevo");
      return null;
    }

    let photo_url: string | null = null;
    if (photoFile) {
      try {
        const path = `${uid}/${Date.now()}-${photoFile.name}`;
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
      .insert({ user_id: uid, text: text || null, photo_url, thingy_id: thingyId ?? null })
      .select()
      .single();

    if (error) {
      console.error("Insert mind note error:", error.message, error.code, error.details);
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
      setSaveError("Error al guardar, intenta de nuevo");
      return null;
    }

    const saved = data as MindNote;
    // Replace temp note with the persisted one (gets real id + photo_url)
    setNotes((prev) => prev.map((n) => (n.id === tempId ? saved : n)));
    return saved.id;
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("mind_notes").delete().eq("id", id);
    if (error) console.error("Delete mind note error:", error.message);
  }, []);

  const updateNoteText = useCallback(async (id: string, text: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    const { error } = await supabase.from("mind_notes").update({ text }).eq("id", id);
    if (error) console.error("Update note text error:", error.message);
  }, []);

  const addPhotoToNote = useCallback(async (id: string, file: File) => {
    const uid = userIdRef.current;
    if (!uid) return;

    const path = `${uid}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type });

    if (uploadError) { console.error("Photo upload error:", uploadError.message); return; }

    const { data: urlData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    const photo_url = urlData.publicUrl;

    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, photo_url } : n)));
    const { error } = await supabase.from("mind_notes").update({ photo_url }).eq("id", id);
    if (error) console.error("Update note photo error:", error.message);
  }, []);

  return (
    <MindNotesContext.Provider value={{ notes, isLoaded, saveError, addNote, deleteNote, updateNoteText, addPhotoToNote }}>
      {children}
    </MindNotesContext.Provider>
  );
}

export function useMindNotes() {
  const ctx = useContext(MindNotesContext);
  if (!ctx) throw new Error("useMindNotes must be inside MindNotesProvider");
  return ctx;
}
