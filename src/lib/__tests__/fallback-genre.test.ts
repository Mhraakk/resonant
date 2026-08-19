import { test } from "node:test";
import assert from "node:assert/strict";
import { clearSession, generateGenreMoodRecommendations } from "../genre-mood-engine";

test("genre-aware results stay differentiated under normal path", async () => {
  clearSession();
  const hip = await generateGenreMoodRecommendations({
    genres: ["hip-hop"],
    moods: ["warm"],
    discoveryDepth: 40,
    limit: 8,
  });
  clearSession();
  const rock = await generateGenreMoodRecommendations({
    genres: ["rock"],
    moods: ["warm"],
    discoveryDepth: 40,
    limit: 8,
  });
  const hipIds = new Set(hip.recommendations.map((r) => r.track.id));
  const rockIds = new Set(rock.recommendations.map((r) => r.track.id));
  let inter = 0;
  for (const id of hipIds) if (rockIds.has(id)) inter++;
  const union = hipIds.size + rockIds.size - inter;
  const j = union === 0 ? 0 : inter / union;
  assert.ok(hip.recommendations.length >= 1, "hip-hop empty");
  assert.ok(rock.recommendations.length >= 1, "rock empty");
  assert.ok(j < 0.85, `overlap too high: ${j}`);
});
