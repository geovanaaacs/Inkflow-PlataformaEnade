import { ClosingCta } from "./sections/ClosingCta";
import { Footer } from "./sections/Footer";
import { Hero } from "./sections/Hero";
import { HowItWorks } from "./sections/HowItWorks";
import { LevelPicker } from "./sections/LevelPicker";
import { ToolsGrid } from "./sections/ToolsGrid";

export function LandingPage() {
  return (
    <>
      <Hero />
      <ToolsGrid />
      <HowItWorks />
      <LevelPicker />
      <ClosingCta />
      <Footer />
    </>
  );
}

export default LandingPage;
