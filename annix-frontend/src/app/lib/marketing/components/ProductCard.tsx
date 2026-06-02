import type { MarketingProduct } from "@annix/product-data/marketing";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { MarketingIcon } from "./MarketingIcon";

export function ProductCard(props: { product: MarketingProduct }) {
  const product = props.product;
  const imageUrl = product.imageUrl ? product.imageUrl : "";

  if (product.comingSoon) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: "color-mix(in srgb, var(--brand-accent) 22%, transparent)" }}
        >
          <MarketingIcon slot={product.iconSlot} className="h-6 w-6" />
        </span>
        <div className="mt-4 text-base font-semibold text-white">{product.name}</div>
        <div className="mt-1 text-sm text-white/50">{product.category}</div>
        <p className="mt-3 text-sm text-white/50">{product.blurb}</p>
        <span className="mt-4 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
          Coming Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/products/${product.detailSlug}`}
      className="group flex flex-col rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-2xl"
    >
      {imageUrl ? (
        <div className="mb-4 overflow-hidden rounded-xl">
          <img
            src={imageUrl}
            alt={product.name}
            className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: "color-mix(in srgb, var(--brand-accent) 16%, white)",
            color: "var(--brand-accent-dark)",
          }}
        >
          <MarketingIcon slot={product.iconSlot} className="h-6 w-6" />
        </span>
      )}
      <div className="mt-4 text-lg font-bold text-slate-900">{product.name}</div>
      <div className="text-sm font-medium text-slate-500">{product.category}</div>
      <p className="mt-3 flex-1 text-sm text-slate-600">{product.blurb}</p>
      <span
        className="mt-5 inline-flex items-center gap-1 text-sm font-semibold transition group-hover:gap-2"
        style={{ color: "var(--brand-accent-dark)" }}
      >
        Learn More
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
