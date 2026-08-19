/**
 * Milestone 10 — Agentic Music Controller
 * Natural-language commands that mutate recommendation state.
 * "Make it darker." / "Keep genre, warmer." / "Take me deeper." / "No vocals."
 */

import type { GenreId } from "./genre-taxonomy";
import { getDepthPolicy } from "./discovery-depth";

export interface AgentState {
  genres: GenreId[];
  moods: string[];
  discoveryDepth: number;
  textureFilters: string[];
  blockedTags: string[];
  energyBias: number; // -1 quieter … +1 more energetic
  darknessBias: number;
  warmthBias: number;
  vocalBias: "any" | "instrumental" | "vocals";
  lastCommand?: string;
}

export function createAgentState(
  genres: GenreId[] = ["electronic"],
  moods: string[] = [],
  depth = 50
): AgentState {
  return {
    genres,
    moods,
    discoveryDepth: depth,
    textureFilters: [],
    blockedTags: [],
    energyBias: 0,
    darknessBias: 0,
    warmthBias: 0,
    vocalBias: "any",
  };
}

export interface AgentResult {
  state: AgentState;
  interpretation: string;
  applied: string[];
}

/**
 * Parse a natural-language command into state mutations.
 * Deterministic rules first — no LLM required for core control.
 */
export function applyAgentCommand(state: AgentState, command: string): AgentResult {
  const cmd = command.toLowerCase().trim();
  const next = { ...state, moods: [...state.moods], textureFilters: [...state.textureFilters], blockedTags: [...state.blockedTags] };
  const applied: string[] = [];
  let interpretation = "";

  // Depth
  if (/deeper|more obscure|more underground|take me deeper/.test(cmd)) {
    next.discoveryDepth = Math.min(100, next.discoveryDepth + 20);
    applied.push(`depth→${next.discoveryDepth}`);
    interpretation = "Increasing discovery depth";
  }
  if (/more familiar|safer|less obscure|pull back/.test(cmd)) {
    next.discoveryDepth = Math.max(0, next.discoveryDepth - 20);
    applied.push(`depth→${next.discoveryDepth}`);
    interpretation = "Reducing discovery depth";
  }

  // Darkness / mood
  if (/darker|more dark|noir|nocturnal/.test(cmd)) {
    next.darknessBias = Math.min(1, next.darknessBias + 0.3);
    if (!next.moods.includes("dark")) next.moods.push("dark");
    if (!next.moods.includes("nocturnal")) next.moods.push("nocturnal");
    applied.push("dark+");
    interpretation = "Biasing toward darker material";
  }
  if (/brighter|lighter|less dark/.test(cmd)) {
    next.darknessBias = Math.max(-1, next.darknessBias - 0.3);
    next.moods = next.moods.filter((m) => m !== "dark" && m !== "nocturnal");
    applied.push("dark-");
    interpretation = "Biasing toward brighter material";
  }

  // Warmth
  if (/warmer|more warm|more organic|cozy/.test(cmd)) {
    next.warmthBias = Math.min(1, next.warmthBias + 0.3);
    if (!next.moods.includes("warm")) next.moods.push("warm");
    if (!next.textureFilters.includes("organic")) next.textureFilters.push("organic");
    applied.push("warm+");
    interpretation = "Biasing warmer / more organic";
  }
  if (/colder|more cold|more synthetic/.test(cmd)) {
    next.warmthBias = Math.max(-1, next.warmthBias - 0.3);
    if (!next.textureFilters.includes("synthetic")) next.textureFilters.push("synthetic");
    applied.push("warm-");
    interpretation = "Biasing colder / synthetic";
  }

  // Energy
  if (/more energy|more intense|harder|faster/.test(cmd)) {
    next.energyBias = Math.min(1, next.energyBias + 0.3);
    applied.push("energy+");
    interpretation = "Raising energy";
  }
  if (/calmer|softer|slower|gentler|quieter/.test(cmd)) {
    next.energyBias = Math.max(-1, next.energyBias - 0.3);
    applied.push("energy-");
    interpretation = "Lowering energy";
  }

  // Vocals
  if (/no vocals|instrumental|without vocals|remove vocals/.test(cmd)) {
    next.vocalBias = "instrumental";
    applied.push("instrumental");
    interpretation = "Preferring instrumental";
  }
  if (/with vocals|add vocals|singing/.test(cmd)) {
    next.vocalBias = "vocals";
    applied.push("vocals");
    interpretation = "Preferring vocal tracks";
  }

  // Texture
  if (/more reverb|spac(e|ious)|wide/.test(cmd)) {
    if (!next.textureFilters.includes("reverb")) next.textureFilters.push("reverb");
    applied.push("reverb");
  }
  if (/tape|analog|vinyl|dusty/.test(cmd)) {
    for (const t of ["tape", "analog", "dusty"]) {
      if (!next.textureFilters.includes(t)) next.textureFilters.push(t);
    }
    applied.push("analog-texture");
  }
  if (/broken drums|broken beat/.test(cmd)) {
    if (!next.textureFilters.includes("broken-drums")) next.textureFilters.push("broken-drums");
    applied.push("broken-drums");
  }

  // Mainstream
  if (/less mainstream|more underground|less popular/.test(cmd)) {
    next.discoveryDepth = Math.min(100, next.discoveryDepth + 15);
    applied.push("underground");
    interpretation = interpretation || "Pushing more underground";
  }

  // Stay / hold
  if (/stay here|hold|keep this|don.?t change/.test(cmd)) {
    applied.push("hold");
    interpretation = "Holding current trajectory";
  }

  // Reset
  if (/reset|clear|start over/.test(cmd)) {
    next.energyBias = 0;
    next.darknessBias = 0;
    next.warmthBias = 0;
    next.vocalBias = "any";
    next.textureFilters = [];
    next.blockedTags = [];
    applied.push("reset");
    interpretation = "Reset agent biases";
  }

  if (!applied.length) {
    interpretation = "No state change — try: darker, warmer, deeper, no vocals, more energy…";
  }

  next.lastCommand = command;
  return { state: next, interpretation, applied };
}

/** Convert agent biases into mood list for the engine */
export function agentMoods(state: AgentState): string[] {
  const moods = new Set(state.moods);
  if (state.darknessBias > 0.2) {
    moods.add("dark");
    moods.add("nocturnal");
  }
  if (state.warmthBias > 0.2) moods.add("warm");
  if (state.energyBias < -0.2) moods.add("calm");
  if (state.energyBias > 0.2) moods.add("intense");
  return Array.from(moods);
}
