"use client";

import { keys } from "es-toolkit/compat";
import { useEffect, useRef, useState } from "react";
import { log } from "@/app/lib/logger";
import { annixIconPack } from "./custom-icon-pack";

let iconsRegistered = false;

interface MermaidBlockProps {
  chart: string;
}

export default function MermaidBlock({ chart }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
        });

        if (!iconsRegistered && mermaid.registerIconPacks) {
          log.info("[MermaidBlock] registering annix icon pack:", keys(annixIconPack.icons));
          mermaid.registerIconPacks([{ name: "annix", icons: annixIconPack }]);
          try {
            const logosModule = await import("@iconify-json/logos");
            log.info(
              "[MermaidBlock] registering logos icon pack, prefix:",
              logosModule.icons?.prefix,
            );
            mermaid.registerIconPacks([{ name: "logos", icons: logosModule.icons }]);
          } catch (err) {
            log.warn("[MermaidBlock] failed to load logos icon pack:", err);
          }
          iconsRegistered = true;
        }

        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg: rendered } = await mermaid.render(id, chart);

        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        log.error("[MermaidBlock] render failed:", err);
        log.error("[MermaidBlock] chart input:", chart.slice(0, 200));
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
          setSvg(null);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (error) {
    return (
      <pre className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 overflow-x-auto">
        {chart}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#323288]" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 overflow-x-auto flex justify-center"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid.render() produces sanitised SVG
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
