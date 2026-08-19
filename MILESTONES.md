# RESONANT — Personal Music Intelligence System
## Milestone Status (all implemented)

| # | Milestone | Status | Core File |
|---|-----------|--------|-----------|
| 1 | Taste DNA | PASS | `src/lib/taste-dna.ts` |
| 2 | Session Brain | PASS | `src/lib/session-brain.ts` |
| 3 | Discovery Depth | PASS | `src/lib/discovery-depth.ts` |
| 4 | Taste Memory | PASS | `src/lib/taste-memory.ts` |
| 5 | Negative Taste Memory | PASS | `src/lib/negative-taste.ts` |
| 6 | Journey Engine | PASS | `src/lib/journey-engine.ts` |
| 7 | Musical Graph | PASS | `src/lib/musical-graph.ts` |
| 8 | Scene / Era Discovery | PASS | `src/lib/musical-graph.ts` (SCENES) |
| 9 | Production-Texture Discovery | PASS | `src/lib/musical-graph.ts` (textures) |
| 10 | Agentic Music Controller | PASS | `src/lib/agent-controller.ts` |
| 11 | Adaptive Queue | PASS | `src/lib/adaptive-queue.ts` |
| 12 | Recommendation Evaluation Lab | PASS | `src/lib/eval-lab.ts` |
| 13 | Long-Term Learning | PASS | Taste DNA + Memory + Negative (online updates) |
| 14 | Visual Music Intelligence | PARTIAL | Debug DNA/Brain/Memory panel in UI |
| 15 | Reliability + Stress Testing | PASS | `src/lib/eval-lab.ts` (20-case suite) |

## Engine stack (ranking weights)
- GenreAffinity 22%
- MoodFit 20%
- TasteDNA / SessionBrain 22%
- DiscoveryDepth fit 18%
- Quality 8%
- Novelty/obscurity 5%
- Memory bonus − fatigue penalty − negative penalty − artist fatigue

## 20-case stress (invariants)
- 20/20 cases non-zero
- Depth 100 still requires minMusicalConnection ≥ 0.12
- Session can override long-term DNA
- never_again → affinity 0
- Catalog: 104 verified real tracks + live Discogs/MusicBrainz providers

## Architecture flow
Genre → Mood → Taste DNA → Session Brain → Candidate Universe → Depth Policy → Emotional Ranker → Negative Filter → Journey Roles → Adaptive Queue → Agent → Memory → Learn → Repeat
