import { Hero } from "@/components/Hero";
import { Methodology } from "@/components/Methodology";
import { SimilarityLookup } from "@/components/SimilarityLookup";
import { Footer } from "@/components/Footer";

export default function Page() {
  return (
    <>
      <Hero />
      <SimilarityLookup />
      <Methodology />
      <Footer />
    </>
  );
}
