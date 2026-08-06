import { ClosingCta } from "./sections/ClosingCta";
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
    </>
  );
}

export default LandingPage;
