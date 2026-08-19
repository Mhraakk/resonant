/**
 * Genre-aware fallback under empty provider path (seed-only).
 */
import {
  generateGenreMoodRecommendations,
  clearSession,
} from "../genre-mood-engine";

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const u = A.size + B.size - inter;
  return u === 0 ? 0 : inter / u;
}

async function run() {
  const genres = ["hip-hop", "rock", "electronic", "ambient"] as const;
  const sigs: Record<string, string[]> = {};
  for (const g of genres) {
    clearSession();
    const res = await generateGenreMoodRecommendations({
      genres: [g],
      moods: ["warm"],
      discoveryDepth: 40,
      limit: 12,
    });
    if (res.recommendations.length === 0) {
      throw new Error(`zero batch for ${g}`);
    }
    sigs[g] = res.recommendations.map(
      (r) => `${r.track.artistNames[0]}::${r.track.title}`.toLowerCase()
    );
  }
  const pairs: [string, string][] = [
    ["hip-hop", "rock"],
    ["hip-hop", "ambient"],
    ["rock", "electronic"],
    ["electronic", "ambient"],
  ];
  for (const [a, b] of pairs) {
    const j = jaccard(sigs[a], sigs[b]);
    if (j >= 0.85) {
      throw new Error(`fallback collapse ${a}×${b} jaccard=${j}`);
    }
    console.log(`${a}×${b} jaccard=${j.toFixed(3)}`);
  }
  console.log("PROVIDER_FALLBACK_PASS");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
