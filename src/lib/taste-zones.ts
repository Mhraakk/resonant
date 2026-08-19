/**
 * RESONANT Taste Zones — explicit model for the selective listener.
 * Aligned with the personal architecture: underground, emotional depth,
 * slow-burn, warm organic textures, high repeat-listen value.
 */

import type { TasteZone } from "@/types/music";

export interface ZoneDefinition {
  id: TasteZone;
  label: string;
  shortLabel: string;
  bpmRange: [number, number];
  description: string;
  desired: string[];
  avoid: string[];
  benchmark?: { artist: string; track: string; year?: number };
  exampleArtists: string[];
  microgenres: string[];
}

export const TASTE_ZONES: Record<TasteZone, ZoneDefinition> = {
  doom_jazz: {
    id: "doom_jazz",
    label: "Doom Jazz / Noir Jazz",
    shortLabel: "Doom Jazz",
    bpmRange: [70, 90],
    description:
      "Dusty bass, dark jazz harmony, noir atmosphere, restrained drums, blues influence, electronic + acoustic dialogue, cinematic tension, late-night mood.",
    desired: [
      "dusty bass",
      "dark jazz harmony",
      "noir atmosphere",
      "restrained drums",
      "cinematic tension",
      "late-night",
    ],
    avoid: ["pure drone", "generic dark ambient", "free-jazz chaos"],
    benchmark: { artist: "DARKSIDE", track: "Paper Trails", year: 2013 },
    exampleArtists: ["Bohren & der Club of Gore", "The Cinematic Orchestra", "Moodymann", "St Germain"],
    microgenres: ["doom jazz", "noir jazz", "dark jazz", "jazz-electronic"],
  },
  velvety_deep_house: {
    id: "velvety_deep_house",
    label: "Velvety Deep House",
    shortLabel: "Velvet House",
    bpmRange: [100, 116],
    description:
      "Warm bass, intimate vocals when appropriate, melancholic chords, subtle groove, understated sensuality, late-night lounge atmosphere.",
    desired: [
      "warm bass",
      "intimate vocals",
      "melancholic chords",
      "subtle groove",
      "late-night lounge",
    ],
    avoid: ["EDM", "commercial vocal house", "festival builds", "big drops", "Ibiza clichés"],
    benchmark: { artist: "Anton Ishutin", track: "Her", year: 2016 },
    exampleArtists: ["Hraach", "Armen Miran", "Bedouin"],
    microgenres: ["deep house", "organic house", "melodic deep house"],
  },
  organic_electronic: {
    id: "organic_electronic",
    label: "Organic Electronic",
    shortLabel: "Organic Electronic",
    bpmRange: [90, 125],
    description:
      "Dialogue between acoustic instruments and electronics — piano, strings, subtle percussion, warm synthesis, evolving arrangement, human imperfection.",
    desired: [
      "acoustic + electronic dialogue",
      "piano",
      "strings",
      "warm synthesis",
      "evolving arrangement",
      "emotional progression",
    ],
    avoid: ["melodic techno", "generic progressive-house crescendos", "predictable cinematic builds"],
    benchmark: { artist: "Kiasmos", track: "Driven", year: 2014 },
    exampleArtists: ["Christian Löffler", "Stimming", "Grandbrothers"],
    microgenres: ["organic electronic", "neo-classical electronic", "acoustic electronic"],
  },
  dark_melancholia: {
    id: "dark_melancholia",
    label: "Dark Melancholia",
    shortLabel: "Dark Melancholia",
    bpmRange: [60, 110],
    description:
      "Melancholy, introspection, restrained darkness, cinematic emotion, nocturnal character, emotional ambiguity. Long-form, cathartic arrival not climax.",
    desired: [
      "melancholy",
      "introspection",
      "restrained darkness",
      "cinematic emotion",
      "nocturnal",
      "emotional ambiguity",
    ],
    avoid: ["overt aggression", "stadium dynamics"],
    exampleArtists: ["Archive", "Radiohead", "Massive Attack", "UNKLE", "Moderat", "Burial"],
    microgenres: ["trip-hop", "post-rock", "dark electronic", "art rock", "experimental pop"],
  },
  triphop_bristol: {
    id: "triphop_bristol",
    label: "Trip-Hop / Bristol DNA",
    shortLabel: "Trip-Hop",
    bpmRange: [70, 100],
    description:
      "Dusty beats, smoky vocals, broken rhythms, tape texture, dub influence, dark sensuality, urban melancholy. Forgotten 90s material and international mutations.",
    desired: [
      "dusty beats",
      "smoky vocals",
      "broken rhythms",
      "tape texture",
      "dub influence",
      "dark sensuality",
    ],
    avoid: ["obvious Portishead clones", "over-polished modern 'triphop'"],
    exampleArtists: ["Tricky", "Portishead", "Martina Topley-Bird"],
    microgenres: ["trip-hop", "Bristol sound", "downtempo", "illbient"],
  },
  jazzy_house: {
    id: "jazzy_house",
    label: "Jazzy House / Deep Groove",
    shortLabel: "Jazzy House",
    bpmRange: [110, 125],
    description:
      "Deep house with jazz harmony, live-feeling instrumentation, saxophone, Rhodes, upright bass, subtle groove, warm production.",
    desired: [
      "jazz harmony",
      "live instrumentation",
      "saxophone",
      "Rhodes",
      "upright bass",
      "subtle groove",
      "warm production",
    ],
    avoid: ["tech house", "EDM house", "aggressive club tracks"],
    exampleArtists: ["St Germain", "Kevin Yost"],
    microgenres: ["jazzy house", "deep house", "nu-jazz", "acid jazz"],
  },
  modern_classical: {
    id: "modern_classical",
    label: "Modern Classical / Minimalism",
    shortLabel: "Modern Classical",
    bpmRange: [40, 90],
    description:
      "Understanding of classical periods, chamber, Romanticism, minimalism, post-minimalism, neo-classical, modern piano, sacred minimalism. Not all piano is neo-classical.",
    desired: [
      "chamber intimacy",
      "minimalist repetition",
      "emotional clarity",
      "space",
      "sacred restraint",
    ],
    avoid: ["generic 'cinematic piano' stock music"],
    exampleArtists: ["Arvo Pärt", "Nils Frahm", "Beethoven", "Schubert", "Bach", "Chopin"],
    microgenres: ["minimalism", "post-minimalism", "neo-classical", "sacred minimalism", "chamber"],
  },
  expressive_guitar: {
    id: "expressive_guitar",
    label: "Expressive Guitar",
    shortLabel: "Expressive Guitar",
    bpmRange: [50, 100],
    description:
      "Expressive phrasing, emotionally meaningful solos, slow or medium tempo, musical storytelling, tone and dynamics over technical virtuosity.",
    desired: [
      "expressive phrasing",
      "emotional solos",
      "storytelling",
      "tone & dynamics",
      "slow-medium tempo",
    ],
    avoid: ["shred", "empty virtuosity", "speed-focused playing"],
    benchmark: { artist: "Frank Zappa", track: "Watermelon in Easter Hay", year: 1979 },
    exampleArtists: ["Frank Zappa", "David Gilmour", "Mark Knopfler"],
    microgenres: ["expressive rock", "psychedelic guitar", "slowcore guitar", "ambient guitar"],
  },
  downtempo_warm: {
    id: "downtempo_warm",
    label: "Downtempo / Chill / Warm Electronic",
    shortLabel: "Warm Downtempo",
    bpmRange: [70, 105],
    description:
      "Downtempo, slow electronic, soulful electronic, soft groove, sunset / morning / after-hours / beach / late-night listening.",
    desired: [
      "warmth",
      "soft groove",
      "soulful",
      "sunset",
      "after-hours",
      "organic pads",
    ],
    avoid: ["cold Berlin minimalism", "harsh industrial", "hard techno", "relentless dark progressive"],
    exampleArtists: [],
    microgenres: ["downtempo", "chillout", "balearic", "warm electronic", "soulful electronic"],
  },
  underground_hiphop: {
    id: "underground_hiphop",
    label: "Underground Hip-Hop / Boom Bap",
    shortLabel: "Und. Hip-Hop",
    bpmRange: [80, 100],
    description:
      "90s hip-hop lineage, jazz rap, dusty samples, underground MCs, experimental beat production. Avoid mainstream algorithmic rap.",
    desired: [
      "dusty samples",
      "jazz harmony",
      "boom bap",
      "underground MC",
      "producer-led",
      "sample culture",
    ],
    avoid: ["mainstream chart rap", "mumble dominance", "festival trap"],
    exampleArtists: ["J Dilla", "GZA", "Mobb Deep", "Madlib", "MF DOOM"],
    microgenres: ["jazz rap", "boom bap", "underground hip-hop", "abstract hip-hop"],
  },
};

export const ZONE_ORDER: TasteZone[] = [
  "doom_jazz",
  "velvety_deep_house",
  "organic_electronic",
  "dark_melancholia",
  "triphop_bristol",
  "jazzy_house",
  "modern_classical",
  "expressive_guitar",
  "downtempo_warm",
  "underground_hiphop",
];

export function getZone(id: TasteZone): ZoneDefinition {
  return TASTE_ZONES[id];
}
