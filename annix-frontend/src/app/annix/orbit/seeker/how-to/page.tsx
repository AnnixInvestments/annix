import { loadAllGuides } from "@/app/annix/orbit/how-to/loader";
import { CV_ASSISTANT_ADMIN_ROLE } from "@/app/annix/orbit/how-to/types";
import HowToIndexClient from "./HowToIndexClient";

export const dynamic = "force-static";

export default function SeekerHowToIndexPage() {
  const guides = loadAllGuides()
    .filter((g) => g.roles.some((r) => r !== CV_ASSISTANT_ADMIN_ROLE))
    .map((g) => ({
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
