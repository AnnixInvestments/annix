import { notFound } from "next/navigation";
import { extractHeadings, loadAllGuides, loadGuideBySlug } from "@/app/stock-control/how-to/loader";
import HowToViewerClient from "./HowToViewerClient";

export const dynamic = "force-static";

export function generateStaticParams() {
  return loadAllGuides().map((g) => ({ slug: g.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function HowToGuidePage(props: PageProps) {
  const { slug } = await props.params;
  const guide = loadGuideBySlug(slug);
  if (!guide) notFound();

  const headings = extractHeadings(guide.body);
  const all = loadAllGuides();
  const sameCategory = all.filter((g) => g.category === guide.category);
  const currentIdx = sameCategory.findIndex((g) => g.slug === guide.slug);
  const prev = currentIdx > 0 ? sameCategory[currentIdx - 1] : null;
  const next =
    currentIdx >= 0 && currentIdx < sameCategory.length - 1 ? sameCategory[currentIdx + 1] : null;

  return (
    <HowToViewerClient
      guide={{
        title: guide.title,
        slug: guide.slug,
        category: guide.category,
        roles: guide.roles,
        tags: guide.tags,
        lastUpdated: guide.lastUpdated,
        summary: guide.summary,
        readingMinutes: guide.readingMinutes,
        body: guide.body,
      }}
      headings={headings}
      prev={prev ? { slug: prev.slug, title: prev.title } : null}
      next={next ? { slug: next.slug, title: next.title } : null}
    />
  );
}
