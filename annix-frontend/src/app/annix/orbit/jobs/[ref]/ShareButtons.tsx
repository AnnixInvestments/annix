"use client";

import { isUndefined } from "es-toolkit/compat";
import { useState } from "react";

interface ShareButtonsProps {
  url: string;
  title: string;
}

// WhatsApp dominates job-sharing in South Africa, so it leads. Native share
// (mobile) and copy-link cover everything else.
export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareText = `${title} — ${url}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  const handleShareOrCopy = async () => {
    // Runs only on user click (browser), so `navigator` is always defined here.
    if (!isUndefined(navigator.share)) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user dismissed or unsupported — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — nothing else to do
    }
  };

  const pill =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-600">Share this job:</span>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className={`${pill} bg-[#25D366] text-white hover:bg-[#1ebe5b]`}
      >
        WhatsApp
      </a>
      <a
        href={linkedInHref}
        target="_blank"
        rel="noreferrer"
        className={`${pill} bg-[#0A66C2] text-white hover:bg-[#095196]`}
      >
        LinkedIn
      </a>
      <button
        type="button"
        onClick={handleShareOrCopy}
        className={`${pill} border border-[#252560]/30 text-[#252560] hover:bg-[#f0f0fc]`}
      >
        {copied ? "Link copied" : "Share / copy link"}
      </button>
    </div>
  );
}
