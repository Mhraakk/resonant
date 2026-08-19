import { getPlatformLinks } from "../external-links";
import type { Track } from "../../types/music";

const track: Track = {
  id: "t1",
  title: "Roads",
  artistIds: ["a1"],
  artistNames: ["Portishead"],
  microgenres: ["trip-hop"],
};

const links = getPlatformLinks(track);
const ids = links.map((l) => l.id);
if (ids.join() !== "spotify,apple,youtube,soundcloud") {
  throw new Error("Expected 4 platforms, got " + ids.join());
}
for (const l of links) {
  if (!l.url.startsWith("http")) throw new Error("not external: " + l.url);
  if (l.url.includes("resonant")) throw new Error("internal route leak: " + l.url);
}
console.log("EXTERNAL_LINKS_PASS");
console.log(JSON.stringify(links.map((l) => ({ id: l.id, url: l.url })), null, 2));
