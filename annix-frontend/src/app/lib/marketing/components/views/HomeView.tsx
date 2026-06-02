import type { MarketingSiteContent } from "@annix/product-data/marketing";
import { CtaBandSection } from "../sections/CtaBandSection";
import { EcosystemSection } from "../sections/EcosystemSection";
import { HeroSection } from "../sections/HeroSection";
import { IndustriesSection } from "../sections/IndustriesSection";
import { TrustBarSection } from "../sections/TrustBarSection";

export function HomeView(props: { content: MarketingSiteContent }) {
  const content = props.content;
  return (
    <>
      <HeroSection hero={content.hero} />
      <TrustBarSection trustBar={content.trustBar} />
      <EcosystemSection ecosystem={content.ecosystem} />
      <IndustriesSection industries={content.industries} />
      <CtaBandSection ctaBand={content.ctaBand} />
    </>
  );
}
