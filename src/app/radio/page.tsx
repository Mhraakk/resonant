"use client";
import { SectionPage } from "@/components/SectionPage";

export default function RadioPage() {
  return (
    <SectionPage
      title="Radio"
      subtitle="Continuous smart radio — hypnotic trajectory"
      defaultGenres={["downtempo", "deep-house", "ambient"]}
      defaultMoods={["hypnotic", "warm"]}
      depth={45}
    />
  );
}
