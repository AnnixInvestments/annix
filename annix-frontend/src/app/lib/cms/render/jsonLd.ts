import type { CmsBlock, FaqBlock, HeroBlock } from "@annix/product-data/cms";

export function faqJsonLdFromBlocks(blocks: CmsBlock[]): Record<string, unknown> | null {
  const faqBlocks = blocks.filter((block): block is FaqBlock => block.type === "faq");
  const items = faqBlocks.flatMap((block) => block.items);
  if (items.length === 0) {
    return null;
  }
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function serviceJsonLdFromBlocks(
  blocks: CmsBlock[],
  options: { name: string; url: string; description: string | null },
): Record<string, unknown> {
  const name = options.name;
  const url = options.url;
  const optDescription = options.description;
  const hero = blocks.find((block): block is HeroBlock => block.type === "hero");
  const heroSubheading = hero ? hero.subheading : "";
  const description = heroSubheading || optDescription || "";
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    url,
  };
  return description ? { ...base, description } : base;
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
