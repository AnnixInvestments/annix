import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchBlogPost(slug: string): Promise<PublicBlogPost | null> {
  const headersList = await headers();
  const host = (headersList.get("host") ?? "").toLowerCase().split(":")[0];
  if (host.length === 0) {
    return null;
  }
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const apiBase = `${protocol}://${host}/api`;
  try {
    const res = await fetch(`${apiBase}/public/au-industries/blog/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await fetchBlogPost(slug);
  if (!post) {
    return { title: "Post Not Found" };
  }
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const metaTitle = post.metaTitle;
  const metaDescription = post.metaDescription;
  const heroUrl = post.heroImageUrl;
  return {
    title: metaTitle || post.title,
    description: metaDescription || post.excerpt,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: metaTitle || post.title,
      description: metaDescription || post.excerpt,
      images: heroUrl ? [{ url: heroUrl, alt: post.title }] : [],
    },
  };
}

function buildJsonLd(post: PublicBlogPost) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const heroUrl = post.heroImageUrl;
  const metaDesc = post.metaDescription;
  const description = metaDesc || post.excerpt;
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    url,
    image: heroUrl ? [heroUrl] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "AU Industries",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/au-industries/logo.jpg`,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };
  return [article, breadcrumbs];
}

export default async function BlogPostPage(props: PageProps) {
  const { slug } = await props.params;
  const post = await fetchBlogPost(slug);
  if (!post) {
    notFound();
  }
  const heroUrl = post.heroImageUrl;
  const publishedAt = post.publishedAt;
  const dateLabel = publishedAt ? formatDateLongZA(publishedAt) : "";
  const jsonLdBlocks = buildJsonLd(post);

  return (
    <div>
      {jsonLdBlocks.map((block) => (
        <script
          key={block["@type"]}
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inline JSON for Google to parse
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}

      {heroUrl !== null && (
        <section className="relative h-64 md:h-96">
          <Image
            src={heroUrl}
            alt={post.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
            <p className="text-[#efcc54] text-sm uppercase tracking-widest mb-3">
              <Link href="/blog" className="hover:underline">
                Blog
              </Link>
              {dateLabel.length > 0 && <span className="mx-2">·</span>}
              {dateLabel.length > 0 && <span>{dateLabel}</span>}
            </p>
            <h1 className="text-2xl md:text-4xl font-bold text-white uppercase tracking-wider leading-tight">
              {post.title}
            </h1>
          </div>
        </section>
      )}

      <article className="bg-white py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4">
          {heroUrl === null && (
            <>
              <p className="text-sm uppercase tracking-widest text-[#B8860B] font-semibold mb-2">
                <Link href="/blog" className="hover:underline">
                  Blog
                </Link>
                {dateLabel.length > 0 && <span className="mx-2 text-gray-400">·</span>}
                {dateLabel.length > 0 && <span className="text-gray-700">{dateLabel}</span>}
              </p>
              <h1 className="text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-8 pb-4 border-b-2 border-[#B8860B]">
                {post.title}
              </h1>
            </>
          )}

          <div className="text-sm text-gray-500 mb-8">By {post.author}</div>

          <div className="prose prose-lg max-w-none prose-headings:text-[#B8860B] prose-headings:uppercase prose-headings:tracking-wide prose-strong:text-gray-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          </div>
        </div>
      </article>

      <section className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-4">
            Have a project to quote?
          </h2>
          <p className="text-gray-300 mb-8">
            We rubber line, fabricate, and supply HDPE pipework from our Boksburg facility.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/quote"
              className="inline-block px-10 py-4 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
            >
              Request a quote
            </Link>
            <Link
              href="/blog"
              className="inline-block px-10 py-4 border-2 border-white text-white font-semibold uppercase tracking-wider hover:bg-white hover:text-gray-900 transition-colors"
            >
              More posts
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
