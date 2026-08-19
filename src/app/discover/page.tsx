"use client";
import { SectionPage } from "@/components/SectionPage";

export default function DiscoverPage() {
  return (
    <SectionPage
      title="Discover"
      subtitle="Deep cuts across scenes — adjacent to your current Taste DNA"
      defaultGenres={["trip-hop", "ambient", "post-rock"]}
      defaultMoods={["nocturnal", "expansive"]}
      depth={65}
    />
  );
}
