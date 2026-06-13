import type {
  CmsBlock,
  CmsBlockType,
  CtaBandBlock,
  FaqBlock,
  FeatureGridBlock,
  GalleryBlock,
  HeroBlock,
  RelatedSolutionsBlock,
  RichTextBlock,
  TrustBadgesBlock,
  TwoColumnBlock,
} from "@annix/product-data/cms";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type CustomRenderers = Partial<
  Record<CmsBlockType, (block: CmsBlock, index: number) => React.ReactNode>
>;

interface BlockRendererProps {
  blocks: CmsBlock[];
  customRenderers?: CustomRenderers;
}

export function BlockRenderer(props: BlockRendererProps) {
  const renderers = props.customRenderers;
  const custom = renderers ?? {};
  return (
    <>
      {props.blocks.map((block, index) => {
        const override = custom[block.type];
        if (override) {
          return <div key={`block-${index}`}>{override(block, index)}</div>;
        }
        return <div key={`block-${index}`}>{renderBlock(block)}</div>;
      })}
    </>
  );
}

function renderBlock(block: CmsBlock): React.ReactNode {
  if (block.type === "hero") {
    return <HeroView block={block} />;
  }
  if (block.type === "richText") {
    return <RichTextView block={block} />;
  }
  if (block.type === "featureGrid") {
    return <FeatureGridView block={block} />;
  }
  if (block.type === "faq") {
    return <FaqView block={block} />;
  }
  if (block.type === "ctaBand") {
    return <CtaBandView block={block} />;
  }
  if (block.type === "gallery") {
    return <GalleryView block={block} />;
  }
  if (block.type === "relatedSolutions") {
    return <RelatedSolutionsView block={block} />;
  }
  if (block.type === "trustBadges") {
    return <TrustBadgesView block={block} />;
  }
  if (block.type === "twoColumn") {
    return <TwoColumnView block={block} />;
  }
  return null;
}

function HeroView(props: { block: HeroBlock }) {
  const block = props.block;
  const imageUrl = block.imageUrl;
  const primaryCta = block.primaryCta;
  const secondaryCta = block.secondaryCta;
  return (
    <section className="relative h-64 md:h-80">
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={block.headline}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      )}
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
        {block.eyebrow.length > 0 && (
          <p className="text-[#efcc54] text-sm uppercase tracking-widest mb-3">{block.eyebrow}</p>
        )}
        <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider leading-tight">
          {block.headline}
        </h1>
        {block.subheading.length > 0 && (
          <p className="text-gray-200 text-lg mt-4 max-w-2xl">{block.subheading}</p>
        )}
        {(primaryCta || secondaryCta) && (
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            {primaryCta && (
              <Link
                href={primaryCta.href}
                className="inline-block px-8 py-3 bg-[#8A6608] text-white font-semibold uppercase tracking-wider hover:bg-[#6E5106] transition-colors"
              >
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="inline-block px-8 py-3 border-2 border-white text-white font-semibold uppercase tracking-wider hover:bg-white hover:text-gray-900 transition-colors"
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function RichTextView(props: { block: RichTextBlock }) {
  return (
    <section className="bg-white py-16">
      <div className="max-w-4xl mx-auto px-4">
        <div
          data-color-mode="light"
          className="au-industries-content prose prose-lg max-w-none prose-headings:text-[#B8860B] prose-headings:uppercase prose-headings:tracking-wide prose-strong:text-gray-900"
        >
          <style>{`
            .au-industries-content p > a:only-child {
              display: inline-block;
              padding: 12px 40px;
              background-color: #8A6608;
              color: #fff !important;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              text-decoration: none !important;
              transition: background-color 0.2s;
            }
            .au-industries-content p > a:only-child:hover {
              background-color: #6E5106;
            }
          `}</style>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{props.block.markdown}</ReactMarkdown>
        </div>
      </div>
    </section>
  );
}

function FeatureGridView(props: { block: FeatureGridBlock }) {
  const block = props.block;
  if (block.items.length === 0) {
    return null;
  }
  return (
    <section className="bg-[#fdf8e8] py-16 border-t border-[#B8860B]/20">
      <div className="max-w-5xl mx-auto px-4">
        {block.heading.length > 0 && (
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
            {block.heading}
          </h2>
        )}
        <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
        {block.subheading.length > 0 && (
          <p className="text-gray-700 text-lg leading-relaxed mb-8">{block.subheading}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {block.items.map((item, idx) => {
            const href = item.href;
            const inner = (
              <div className="bg-white rounded-lg border-2 border-[#B8860B]/20 shadow-sm p-6 h-full">
                <div className="font-bold text-gray-900 text-lg leading-tight mb-2">
                  {item.title}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{item.blurb}</p>
              </div>
            );
            if (href) {
              return (
                <Link
                  key={`${item.title}-${idx}`}
                  href={href}
                  className="block hover:shadow-lg transition-shadow rounded-lg"
                >
                  {inner}
                </Link>
              );
            }
            return <div key={`${item.title}-${idx}`}>{inner}</div>;
          })}
        </div>
      </div>
    </section>
  );
}

function FaqView(props: { block: FaqBlock }) {
  const block = props.block;
  if (block.items.length === 0) {
    return null;
  }
  return (
    <section
      id="frequently-asked-questions"
      className="bg-[#fdf8e8] py-16 border-t border-[#B8860B]/20"
    >
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
          {block.heading}
        </h2>
        <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-10" />
        <div className="space-y-6">
          {block.items.map((faq) => (
            <details
              key={faq.question}
              className="group bg-white rounded-lg border border-[#B8860B]/20 shadow-sm overflow-hidden"
            >
              <summary className="cursor-pointer px-6 py-4 font-semibold text-gray-900 flex items-center justify-between hover:bg-[#fdf8e8] transition-colors">
                <span>{faq.question}</span>
                <span className="text-[#B8860B] text-2xl ml-4 flex-shrink-0 group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <div className="px-6 pb-5 pt-2 text-gray-700 leading-relaxed border-t border-gray-100">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBandView(props: { block: CtaBandBlock }) {
  const block = props.block;
  const primaryCta = block.primaryCta;
  const secondaryCta = block.secondaryCta;
  return (
    <section className="bg-gray-900 py-16">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-4">
          {block.headline}
        </h2>
        {block.subheading.length > 0 && <p className="text-gray-300 mb-8">{block.subheading}</p>}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {primaryCta && (
            <Link
              href={primaryCta.href}
              className="inline-block px-10 py-4 bg-[#8A6608] text-white font-semibold uppercase tracking-wider hover:bg-[#6E5106] transition-colors"
            >
              {primaryCta.label}
            </Link>
          )}
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className="inline-block px-10 py-4 border-2 border-white text-white font-semibold uppercase tracking-wider hover:bg-white hover:text-gray-900 transition-colors"
            >
              {secondaryCta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function GalleryView(props: { block: GalleryBlock }) {
  const block = props.block;
  if (block.images.length === 0) {
    return null;
  }
  return (
    <section className="bg-white py-16">
      <div className="max-w-5xl mx-auto px-4">
        {block.heading.length > 0 && (
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-8">
            {block.heading}
          </h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {block.images.map((image, idx) => (
            <div
              key={`${image.url}-${idx}`}
              className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-white shadow-md"
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedSolutionsView(props: { block: RelatedSolutionsBlock }) {
  const block = props.block;
  if (block.items.length === 0) {
    return null;
  }
  return (
    <section className="bg-[#fdf8e8] py-16 border-t border-[#B8860B]/20">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
          {block.heading}
        </h2>
        <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {block.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block bg-white rounded-lg border-2 border-[#B8860B]/20 shadow-sm hover:shadow-lg transition-shadow p-6"
            >
              <div className="font-bold text-gray-900 text-lg leading-tight mb-2 group-hover:text-[#B8860B] transition-colors">
                {item.title}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              <span className="inline-block mt-3 text-sm font-semibold uppercase tracking-wider text-[#8A6608]">
                Learn more →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustBadgesView(props: { block: TrustBadgesBlock }) {
  const block = props.block;
  if (block.items.length === 0) {
    return null;
  }
  return (
    <section className="bg-white py-12">
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {block.items.map((badge) => (
          <div key={badge.title} className="border border-[#B8860B]/30 rounded-lg p-4 text-center">
            <div className="text-lg font-bold text-[#B8860B] uppercase">{badge.title}</div>
            <div className="text-sm text-gray-600 mt-1">{badge.subtitle}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TwoColumnView(props: { block: TwoColumnBlock }) {
  const block = props.block;
  const imageUrl = block.imageUrl;
  const textCol = (
    <div className="flex-1">
      {block.heading.length > 0 && (
        <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-4">
          {block.heading}
        </h2>
      )}
      <div className="prose prose-lg max-w-none prose-strong:text-gray-900">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.body}</ReactMarkdown>
      </div>
    </div>
  );
  const imageCol = imageUrl ? (
    <div className="flex-1 relative min-h-[260px] rounded-lg overflow-hidden">
      <Image
        src={imageUrl}
        alt={block.heading}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    </div>
  ) : null;
  return (
    <section className="bg-white py-16">
      <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row gap-10 items-center">
        {block.imageRight ? (
          <>
            {textCol}
            {imageCol}
          </>
        ) : (
          <>
            {imageCol}
            {textCol}
          </>
        )}
      </div>
    </section>
  );
}
