import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { formatDateLongZA } from "@/app/lib/datetime";

const SITE_URL = "https://auind.co.za";

interface PublicBlogPost {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  excerpt: string;
  content: string;
  heroImageUrl: string | null;
  author: string;
  publishedAt: string | null;
  isPublished: boolean;
}

export const metadata: Metadata = {
  title: "Blog & News",
  description:
    "Industry insights, project updates, and product news from AU Industries — rubber lining, ceramic embedded rubber, HDPE piping, and mining solutions in Southern Africa.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/blog`,
    title: "Blog & News | AU Industries",
    description: "Industry insights, project updates, and product news from AU Industries.",
  },
};

async function fetchBlogPosts(): Promise<PublicBlogPost[]> {
  const headersList = await headers();
  const host = (headersList.get("host") ?? "").toLowerCase().split(":")[0];
  if (host.length === 0) {
    return [];
  }
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const apiBase = `${protocol}://${host}/api`;
  try {
    const res = await fetch(`${apiBase}/public/au-industries/blog`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return [];
    }
    return res.json();
  } catch {
    return [];
  }
}

function buildJsonLd(posts: PublicBlogPost[]) {
  if (posts.length === 0) {
    return null;
  }
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog`,
    name: "AU Industries Blog",
    url: `${SITE_URL}/blog`,
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `${SITE_URL}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      author: { "@type": "Organization", name: post.author },
      description: post.excerpt,
    })),
  };
}

export default async function BlogIndexPage() {
  const posts = await fetchBlogPosts();
  const jsonLd = buildJsonLd(posts);
  const hasPosts = posts.length > 0;

  return (
    <div>
      {jsonLd !== null && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Blog JSON-LD must be inline JSON for Google to parse
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <section
        className="relative h-56 md:h-72 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url(/au-industries/AUI-banner3.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider mb-3">
            Blog &amp; News
          </h1>
          <p className="text-[#efcc54] text-base md:text-lg max-w-2xl">
            Project updates, product launches, and industry insights from AU Industries
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          {hasPosts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Posts are on the way — check back soon for project updates and industry insights.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function BlogPostCard(props: { post: PublicBlogPost }) {
  const heroUrl = props.post.heroImageUrl;
  const publishedAt = props.post.publishedAt;
  const dateLabel = publishedAt ? formatDateLongZA(publishedAt) : "";

  return (
    <Link
      href={`/blog/${props.post.slug}`}
      className="group block bg-white rounded-lg overflow-hidden border-2 border-white shadow-md hover:shadow-xl transition-shadow"
    >
      {heroUrl !== null && (
        <div className="relative h-44">
          <Image
            src={heroUrl}
            alt={props.post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-5">
        <div className="text-xs uppercase tracking-widest text-[#B8860B] font-semibold mb-1">
          {dateLabel}
        </div>
        <h2 className="font-bold text-gray-900 leading-snug mb-2 text-lg">{props.post.title}</h2>
        <p className="text-sm text-gray-600 line-clamp-3">{props.post.excerpt}</p>
      </div>
    </Link>
  );
}
