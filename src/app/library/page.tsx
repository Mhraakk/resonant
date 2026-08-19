"use client";
import { SectionPage } from "@/components/SectionPage";

export default function LibraryPage() {
  return (
    <SectionPage
      title="Library"
      subtitle="Familiar anchors and high-affinity material"
      defaultGenres={["jazz", "soul"]}
      defaultMoods={["warm", "intimate"]}
      depth={20}
    />
  );
}
