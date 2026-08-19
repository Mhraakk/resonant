/**
 * Playback state-machine regression tests.
 * Run: npx tsx src/lib/__tests__/player-state.test.ts
 */
import { usePlayerStore } from "../../stores/player";
import type { Track } from "../../types/music";

function baseTrack(over: Partial<Track> = {}): Track {
  return {
    id: "t-test",
    title: "Test Track",
    artistIds: ["a-1"],
    artistNames: ["Tester"],
    durationMs: 180000,
    microgenres: ["jazz"],
    ...over,
  };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function reset() {
  usePlayerStore.getState().clear();
}

function run() {
  reset();
  const withPreview = baseTrack({ previewUrl: "https://example.com/p.mp3" });
  usePlayerStore.getState().play(withPreview);
  let s = usePlayerStore.getState();
  assert(s.playbackMode === "loading", "expected loading after play with preview");
  assert(s.isPlaying === false, "must not be playing before markPlaying");
  usePlayerStore.getState().markPlaying();
  s = usePlayerStore.getState();
  assert(s.isPlaying === true, "expected playing after markPlaying");
  assert(s.playbackMode === "preview", "expected preview mode");

  reset();
  usePlayerStore.getState().play(baseTrack({ previewUrl: undefined }));
  s = usePlayerStore.getState();
  assert(s.playbackMode === "external_only", "expected external_only");
  assert(s.isPlaying === false, "must never play without source");
  usePlayerStore.getState().markPlaying();
  s = usePlayerStore.getState();
  assert(s.isPlaying === false, "markPlaying must no-op without previewUrl");

  reset();
  usePlayerStore.getState().play(withPreview);
  usePlayerStore.getState().markPlaybackFailed("rejected");
  s = usePlayerStore.getState();
  assert(s.isPlaying === false, "failed play must not stay playing");
  assert(s.playbackMode === "error", "expected error mode");

  console.log("PLAYER_STATE_TESTS_PASS");
}

run();
