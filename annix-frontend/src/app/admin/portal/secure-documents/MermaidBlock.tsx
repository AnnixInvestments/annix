"use client";

import { useEffect, useRef, useState } from "react";

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

        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg: rendered } = await mermaid.render(id, chart);

        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
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
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
