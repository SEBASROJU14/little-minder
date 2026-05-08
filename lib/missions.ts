export type EnergyLevel = "low" | "medium" | "high";

export interface Chunk {
  id: string;
  text: string;
  completed: boolean;
}

export interface Thingy {
  id: string;
  text: string;
  energyLevel: EnergyLevel;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  isCustom: boolean;
  isDaily: boolean;
  requirePhotoProof: boolean;
  progress: number; // 0, 25, 50, 75, 100
  hasProof?: boolean;
  proofMessage?: string;
  lastCompletedDate?: string;
  deadline?: string; // ISO date string (YYYY-MM-DD)
  chunksEnabled: boolean;
  chunks: Chunk[];
}

/** Compute snapped progress (0/25/50/75/100) from chunk completion ratio */
export function calcChunkProgress(chunks: Chunk[]): number {
  if (chunks.length === 0) return 0;
  const pct = (chunks.filter((c) => c.completed).length / chunks.length) * 100;
  return Math.min(100, Math.round(pct / 25) * 25);
}

export const CAT_MESSAGES: Record<EnergyLevel, string[]> = {
  low: [
    "we can do one small thingy",
    "it's okay to go slow",
    "even tiny things count",
    "rest is also doing something",
    "you showed up, that matters",
  ],
  medium: [
    "one thingy at a time",
    "steady is just right",
    "this counts too",
    "you're doing fine",
    "small things add up",
  ],
  high: [
    "let's use this energy well",
    "you've got this",
    "good things ahead",
    "go at your own pace",
    "feeling it? let's go",
  ],
};

export const CAT_IDLE_MESSAGES = [
  "still here :)",
  "no rush",
  "one thing at a time",
  "you've got this",
  "small things count",
  "take it easy",
  "i'm rooting for you",
  "breathe",
];

export function getRandomCatMessage(energy: EnergyLevel): string {
  const msgs = CAT_MESSAGES[energy];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

const HIGH_WORDS = ["exercise", "run", "workout", "gym", "tackle", "call", "clean", "cook", "write", "study", "project", "meeting", "build"];
const LOW_WORDS  = ["water", "breathe", "breath", "rest", "relax", "drink", "sit", "open", "close", "pill", "medication", "medicine", "tablet", "sleep", "nap", "stretch"];

export function suggestEnergy(text: string): EnergyLevel {
  const lower = text.toLowerCase();
  if (HIGH_WORDS.some((w) => lower.includes(w))) return "high";
  if (LOW_WORDS.some((w) => lower.includes(w))) return "low";
  return "medium";
}

export function createThingy(
  text: string,
  energyLevel: EnergyLevel,
  options: {
    isCustom?: boolean;
    isDaily?: boolean;
    requirePhotoProof?: boolean;
    deadline?: string;
  } = {}
): Thingy {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text,
    energyLevel,
    completed: false,
    createdAt: new Date().toISOString(),
    isCustom: options.isCustom ?? true,
    isDaily: options.isDaily ?? false,
    requirePhotoProof: options.requirePhotoProof ?? false,
    progress: 0,
    deadline: options.deadline,
    chunksEnabled: false,
    chunks: [],
  };
}

export const XP_REWARDS: Record<EnergyLevel, number> = {
  low: 10,
  medium: 20,
  high: 30,
};

export const PROOF_BONUS_XP = 5;

export function getLevelFromXP(xp: number): { level: number; current: number; needed: number } {
  const xpPerLevel = 100;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const current = xp % xpPerLevel;
  return { level, current, needed: xpPerLevel };
}

export function isNearDeadline(deadline: string | undefined): boolean {
  if (!deadline) return false;
  const d = new Date(deadline + "T23:59:59");
  const diff = d.getTime() - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
}

export function isPastDeadline(deadline: string | undefined): boolean {
  if (!deadline) return false;
  const d = new Date(deadline + "T23:59:59");
  return d.getTime() < Date.now();
}

export function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.getTime() === today.getTime()) return "today";
  if (date.getTime() === tomorrow.getTime()) return "tomorrow";

  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff > 0 && diff <= 6) return date.toLocaleDateString("en", { weekday: "short" });
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}
