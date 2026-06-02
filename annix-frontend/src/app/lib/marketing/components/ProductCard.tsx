import type { MarketingProduct } from "@annix/product-data/marketing";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { MarketingIcon } from "./MarketingIcon";

export function ProductCard(props: { product: MarketingProduct }) {
  const product = props.product;
  const href = product.comingSoon ? "/labs" : `/products/${product.detailSlug}`;
  const imageUrl = product.imageUrl ? product.imageUrl : "";
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/25 hover:bg-white/10"
    >
      {product.comingSoon ? (
        <span className="absolute right-4 top-4 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
          Coming soon
        </span>
      ) : null}
      {imageUrl ? (
        <div className="mb-4 overflow-hidden rounded-xl">
          <img
            src={imageUrl}
            alt={product.name}
            className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: "color-mix(in srgb, var(--brand-accent) 22%, transparent)" }}
        >
          <MarketingIcon slot={product.iconSlot} className="h-6 w-6" />
        </div>
      )}
      <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/40">
        {product.category}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{product.name}</div>
      <p className="mt-2 flex-1 text-sm text-white/60">{product.blurb}</p>
      <div
        className="mt-4 flex items-center gap-1 text-sm font-semibold transition group-hover:gap-2"
        style={{ color: "var(--brand-accent)" }}
      >
        {product.comingSoon ? "See Annix Labs" : "Learn more"}
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
