import type { MarketingSiteContent } from "@annix/product-data/marketing";
import { ConnectSection } from "../sections/ConnectSection";
import { EcosystemSection } from "../sections/EcosystemSection";
import { HeroSection } from "../sections/HeroSection";
import { IndustriesSection } from "../sections/IndustriesSection";

export function HomeView(props: { content: MarketingSiteContent }) {
  const content = props.content;
  return (
    <>
      <HeroSection hero={content.hero} />
      <EcosystemSection ecosystem={content.ecosystem} />
      <IndustriesSection industries={content.industries} />
      <ConnectSection
        partners={content.partners}
        globalPresence={content.globalPresence}
        ctaBand={content.ctaBand}
      />
    </>
  );
}
