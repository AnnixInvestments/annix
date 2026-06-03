"use client";

import type { MarketingProduct } from "@annix/product-data/marketing";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MarketingIcon } from "./MarketingIcon";

export function ProductCard(props: { product: MarketingProduct }) {
  const product = props.product;
  const [imgFailed, setImgFailed] = useState(false);

  if (product.comingSoon) {
    const comingImage = product.imageUrl ? product.imageUrl : "";
    const showComingImage = comingImage !== "" && !imgFailed;
    return (
      <div className="flex flex-col">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-[#ff6c00]/60 bg-white/5">
          {showComingImage ? (
            <img
              src={comingImage}
              alt={product.name}
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--brand-accent) 22%, transparent)",
                }}
              >
                <MarketingIcon slot={product.iconSlot} className="h-5 w-5" />
              </span>
            </div>
          )}
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur">
            Coming Soon
          </span>
        </div>
        <div className="mt-3 text-sm font-semibold text-white">{product.name}</div>
        <div className="text-xs text-white/50">{product.category}</div>
      </div>
    );
  }

  const explicit = product.imageUrl ? product.imageUrl : "";
  const brandFallback = product.appKey
    ? `/api/public/branding/${product.appKey}/asset/loginCard`
    : "";
  const src = explicit ? explicit : brandFallback;
  const showImage = src !== "" && !imgFailed;

  return (
    <Link href={`/products/${product.detailSlug}`} className="group flex flex-col">
      <div className="aspect-[4/5] overflow-hidden rounded-xl border border-[#ff6c00]/60 bg-slate-900">
        {showImage ? (
          <img
            src={src}
            alt={product.name}
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
              style={{
                backgroundColor: "color-mix(in srgb, var(--brand-accent) 22%, transparent)",
              }}
            >
              <MarketingIcon slot={product.iconSlot} className="h-6 w-6" />
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 text-sm font-bold text-white">{product.name}</div>
      <div className="text-xs text-white/50">{product.category}</div>
      <span
        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold transition group-hover:gap-2"
        style={{ color: "var(--brand-accent)" }}
      >
        Learn More
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
