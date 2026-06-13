import type { CmsBlock, FaqBlock } from "@annix/product-data/cms";

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
