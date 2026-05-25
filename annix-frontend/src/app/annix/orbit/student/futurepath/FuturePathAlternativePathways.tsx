"use client";

import { alternativePathwaysForClusters } from "@annix/product-data/orbit-education";

interface FuturePathAlternativePathwaysProps {
  clusters: string[];
}

/**
 * Alternative post-school pathways (#304 Phase 2). Pure, content-driven — shows
 * routes (trade, diploma, extended/foundation, online, bridging) relevant to the
 * learner's interests, framed as options if first-choice degrees are a stretch.
 */
export default function FuturePathAlternativePathways(props: FuturePathAlternativePathwaysProps) {
  const pathways = alternativePathwaysForClusters(props.clusters);
  if (pathways.length === 0) return null;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="font-medium text-gray-900 mb-1">Other pathways to consider</h2>
      <p className="text-xs text-gray-500 mb-3">
        If a first-choice degree is a stretch — or you just want options — these routes can get you
        to the same career, often faster or more affordably.
      </p>
      <ul className="space-y-3">
        {pathways.map((pathway) => (
          <li key={pathway.type} className="rounded border border-gray-200 p-3 text-sm">
            <span className="font-medium">{pathway.label}</span>
            <p className="mt-1 text-xs text-gray-600">{pathway.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
