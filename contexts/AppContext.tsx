"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Thingy, Chunk, EnergyLevel, createThingy, XP_REWARDS, PROOF_BONUS_XP } from "@/lib/missions";
import { supabase } from "@/lib/supabase";

const USER_ID = "default_user";

interface AppState {
  energy: EnergyLevel | null;
  energyDate: string | null;
  thingys: Thingy[];
  xp: number;
  isLoaded: boolean;
}

interface AppContextValue extends AppState {
  setEnergy: (level: EnergyLevel) => void;
  addThingy: (
    text: string,
    energyLevel: EnergyLevel,
    opts?: { isDaily?: boolean; requirePhotoProof?: boolean; deadline?: string }
  ) => Thingy;
  updateThingy: (id: string, updates: Partial<Thingy>) => void;
  completeThingy: (id: string, proofMessage?: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// --- DB row ↔ Thingy mapping ---

type DbRow = Record<string, unknown>;

function rowToThingy(row: DbRow): Thingy {
  return {
    id: row.id as string,
    text: row.title as string,
    energyLevel: row.energy as EnergyLevel,
    completed: row.completed as boolean,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string | null) ?? undefined,
    isCustom: (row.is_custom as boolean | null) ?? true,
    isDaily: row.daily as boolean,
    requirePhotoProof: row.require_photo as boolean,
    progress: row.progress as number,
    hasProof: (row.has_proof as boolean | null) ?? undefined,
    proofMessage: (row.proof_message as string | null) ?? undefined,
    lastCompletedDate: (row.last_completed_date as string | null) ?? undefined,
    deadline: (row.deadline as string | null) ?? undefined,
    chunksEnabled: (row.chunks_enabled as boolean | null) ?? false,
    chunks: (row.chunks as Chunk[] | null) ?? [],
  };
}

function thingyToRow(t: Thingy): DbRow {
  return {
    id: t.id,
    user_id: USER_ID,
    title: t.text,
    energy: t.energyLevel,
    completed: t.completed,
    created_at: t.createdAt,
    completed_at: t.completedAt ?? null,
    is_custom: t.isCustom,
    daily: t.isDaily,
    require_photo: t.requirePhotoProof,
    progress: t.progress,
    has_proof: t.hasProof ?? null,
    proof_message: t.proofMessage ?? null,
    last_completed_date: t.lastCompletedDate ?? null,
    deadline: t.deadline ?? null,
    chunks_enabled: t.chunksEnabled,
    chunks: t.chunks,
  };
}

function updatesToRow(updates: Partial<Thingy>): DbRow {
  const row: DbRow = {};
  if ("text" in updates)              row.title               = updates.text;
  if ("energyLevel" in updates)       row.energy              = updates.energyLevel;
  if ("completed" in updates)         row.completed           = updates.completed;
  if ("completedAt" in updates)       row.completed_at        = updates.completedAt ?? null;
  if ("isCustom" in updates)          row.is_custom           = updates.isCustom;
  if ("isDaily" in updates)           row.daily               = updates.isDaily;
  if ("requirePhotoProof" in updates) row.require_photo       = updates.requirePhotoProof;
  if ("progress" in updates)          row.progress            = updates.progress;
  if ("hasProof" in updates)          row.has_proof           = updates.hasProof ?? null;
  if ("proofMessage" in updates)      row.proof_message       = updates.proofMessage ?? null;
  if ("lastCompletedDate" in updates) row.last_completed_date = updates.lastCompletedDate ?? null;
  if ("deadline" in updates)          row.deadline            = updates.deadline ?? null;
  if ("chunksEnabled" in updates)     row.chunks_enabled      = updates.chunksEnabled;
  if ("chunks" in updates)            row.chunks              = updates.chunks;
  return row;
}

// --------------------------------

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    energy: null, energyDate: null, thingys: [], xp: 0, isLoaded: false,
  });

  useEffect(() => {
    async function load() {
      const energy = localStorage.getItem("lm_energy") as EnergyLevel | null;
      const energyDate = localStorage.getItem("lm_energy_date");

      try {
        const { data: rows, error: tErr } = await supabase
          .from("thingys")
          .select("*")
          .eq("user_id", USER_ID)
          .order("created_at", { ascending: false });

        if (tErr) throw new Error(tErr.message);

        const today = new Date().toDateString();
        let thingys: Thingy[] = (rows ?? []).map(rowToThingy);

        const resetIds = thingys
          .filter((t) => t.isDaily && t.completed && t.lastCompletedDate !== today)
          .map((t) => t.id);

        if (resetIds.length > 0) {
          supabase
            .from("thingys")
            .update({ completed: false, progress: 0 })
            .in("id", resetIds)
            .then(({ error }) => {
              if (error) console.error("Daily reset error:", error.message);
            });
          thingys = thingys.map((t) =>
            resetIds.includes(t.id) ? { ...t, completed: false, progress: 0 } : t
          );
        }

        const { data: xpRow, error: xErr } = await supabase
          .from("user_xp")
          .select("xp")
          .eq("user_id", USER_ID)
          .maybeSingle();

        if (xErr) throw new Error(xErr.message);
        const xp = (xpRow as { xp: number } | null)?.xp ?? 0;

        setState({ energy, energyDate, thingys, xp, isLoaded: true });
      } catch (err) {
        console.error("Supabase load error:", err);
        // Fail open — show the app with empty state rather than blank forever
        setState({ energy, energyDate, thingys: [], xp: 0, isLoaded: true });
      }
    }

    load();
  }, []);

  const setEnergy = useCallback((level: EnergyLevel) => {
    const date = new Date().toDateString();
    localStorage.setItem("lm_energy", level);
    localStorage.setItem("lm_energy_date", date);
    setState((p) => ({ ...p, energy: level, energyDate: date }));
  }, []);

  const addThingy = useCallback(
    (text: string, energyLevel: EnergyLevel, opts = {}): Thingy => {
      const t = createThingy(text, energyLevel, { isCustom: true, ...opts });
      setState((p) => ({ ...p, thingys: [t, ...p.thingys] }));
      // .then() is required — Supabase v2 queries are lazy and only execute on await/.then()
      supabase.from("thingys").insert(thingyToRow(t)).then(({ error }) => {
        if (error) console.error("Insert thingy error:", error.message);
      });
      return t;
    },
    []
  );

  const updateThingy = useCallback((id: string, updates: Partial<Thingy>) => {
    setState((p) => ({
      ...p,
      thingys: p.thingys.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    supabase.from("thingys").update(updatesToRow(updates)).eq("id", id).then(({ error }) => {
      if (error) console.error("Update thingy error:", error.message);
    });
  }, []);

  const completeThingy = useCallback((id: string, proofMessage?: string) => {
    const today = new Date().toDateString();
    const completedAt = new Date().toISOString();

    setState((p) => {
      const original = p.thingys.find((t) => t.id === id);
      const earned = original
        ? XP_REWARDS[original.energyLevel] + (proofMessage ? PROOF_BONUS_XP : 0)
        : 0;
      const newXP = p.xp + earned;

      supabase.from("thingys").update({
        completed: true,
        progress: 100,
        completed_at: completedAt,
        last_completed_date: today,
        ...(proofMessage ? { has_proof: true, proof_message: proofMessage } : {}),
      }).eq("id", id).then(({ error }) => {
        if (error) console.error("Complete thingy error:", error.message);
      });

      supabase.from("user_xp").upsert(
        { user_id: USER_ID, xp: newXP, updated_at: completedAt },
        { onConflict: "user_id" }
      ).then(({ error }) => {
        if (error) console.error("Upsert XP error:", error.message);
      });

      return {
        ...p,
        xp: newXP,
        thingys: p.thingys.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: true,
                progress: 100,
                completedAt,
                lastCompletedDate: today,
                ...(proofMessage ? { hasProof: true, proofMessage } : {}),
              }
            : t
        ),
      };
    });
  }, []);

  return (
    <AppContext.Provider value={{ ...state, setEnergy, addThingy, updateThingy, completeThingy }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
