import { loadAllGuides } from "@/app/stock-control/how-to/loader";
import HowToIndexClient from "./HowToIndexClient";

export const dynamic = "force-static";

export default function HowToIndexPage() {
  const guides = loadAllGuides().map((g) => ({
    title: g.title,
    slug: g.slug,
    category: g.category,
    roles: g.roles,
    order: g.order,
    tags: g.tags,
    lastUpdated: g.lastUpdated,
    summary: g.summary,
    readingMinutes: g.readingMinutes,
  }));

  return <HowToIndexClient guides={guides} />;
}
