"use client";

import { DocumentBucket, type DocumentBucketProps } from "./DocumentBucket";

export interface DocumentsForExtractionPanelProps {
  buckets: DocumentBucketProps[];
  className?: string;
}

export function DocumentsForExtractionPanel(props: DocumentsForExtractionPanelProps) {
  const { buckets, className } = props;
  return (
    <div className={className ?? "space-y-3"}>
      {buckets.map((bucket) => (
        <DocumentBucket key={bucket.id} {...bucket} />
      ))}
    </div>
  );
}
