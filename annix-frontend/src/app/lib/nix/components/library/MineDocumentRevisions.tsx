"use client";

import { fromISO } from "@/app/lib/datetime";
import { useMineDocumentRevisions } from "@/app/lib/query/hooks";

export interface MineDocumentRevisionsProps {
  documentNumber: string;
  mineId?: number | null;
  backHref: string;
  /**
   * When the user clicks 'View extraction', host can wire navigation to the
   * draft / spec viewer for that extraction. If omitted the row is read-only.
   */
  onViewExtraction?: (extractionId: number) => void;
}

/**
 * Read-only archive of every Nix extraction stored for a single document
 * number — current canonical at the top, superseded older versions below.
 * Lets the quoter audit revision history (when did rev 03 land, what was
 * rev 02's data, what's the path back to the source PDF).
 *
 * Driven by `GET /nix/mine-library/documents/:docNumber/revisions`. Shared
 * across apps via lib/nix/components/library so RFQ + Comply-SA can mount
 * it inside their own portal layouts without duplicating the table logic.
 */
export function MineDocumentRevisions(props: MineDocumentRevisionsProps) {
  const { documentNumber, mineId, backHref, onViewExtraction } = props;
  const query = useMineDocumentRevisions(documentNumber, { mineId });

  const rowsData = query.data;
  const rows = rowsData ? rowsData : [];
  const latest = rows.find((r) => r.isLatestRevision);
  const superseded = rows.filter((r) => !r.isLatestRevision);
  const errorObj = query.error;
  const errorMessage = errorObj ? errorObj.message : "";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <a href={backHref} className="text-xs text-blue-600 hover:text-blue-800 underline">
        ← Back
      </a>
      <header className="mt-2 mb-4">
        <h1 className="text-xl font-bold text-gray-900 font-mono">{documentNumber}</h1>
        <p className="text-sm text-gray-600">Revision history</p>
      </header>

      {query.isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : query.isError ? (
        <p className="text-sm text-red-600">Couldn't load revisions. {errorMessage}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">No extractions on file for this document number.</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-xs uppercase tracking-wider font-semibold text-emerald-700 mb-2">
              Latest revision
            </h2>
            {latest ? (
              <RevisionTable rows={[latest]} onViewExtraction={onViewExtraction} tone="latest" />
            ) : (
              <p className="text-sm text-gray-500">No row currently flagged as latest.</p>
            )}
          </section>

          {superseded.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider font-semibold text-amber-700 mb-2">
                Superseded revisions ({superseded.length})
              </h2>
              <RevisionTable
                rows={superseded}
                onViewExtraction={onViewExtraction}
                tone="superseded"
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function RevisionTable(props: {
  rows: Array<{
    id: number;
    documentRevision: string | null;
    documentTitle: string | null;
    sourceFilename: string | null;
    isLatestRevision: boolean;
    supersededByExtractionId: number | null;
    status: string;
    createdAt: string;
  }>;
  onViewExtraction?: (extractionId: number) => void;
  tone: "latest" | "superseded";
}) {
  const { rows, onViewExtraction, tone } = props;
  const rowBg = tone === "latest" ? "bg-emerald-50/30" : "bg-amber-50/20 text-gray-600";
  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium text-gray-700">Rev</th>
            <th className="px-3 py-2 font-medium text-gray-700">Title / Filename</th>
            <th className="px-3 py-2 font-medium text-gray-700">Status</th>
            <th className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">Captured</th>
            <th className="px-3 py-2 font-medium text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const revValue = r.documentRevision;
            const rev = revValue ? revValue : "—";
            const titleValue = r.documentTitle;
            const filenameValue = r.sourceFilename;
            const titleOrFilename = titleValue ? titleValue : filenameValue ? filenameValue : "—";
            const captured = fromISO(r.createdAt).toFormat("dd MMM yyyy");
            const supersededId = r.supersededByExtractionId;
            return (
              <tr key={r.id} className={rowBg}>
                <td className="px-3 py-2 font-mono text-xs">{rev}</td>
                <td className="px-3 py-2">{titleOrFilename}</td>
                <td className="px-3 py-2 text-xs">{r.status}</td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{captured}</td>
                <td className="px-3 py-2 text-xs">
                  {onViewExtraction && (
                    <button
                      type="button"
                      onClick={() => onViewExtraction(r.id)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View extraction #{r.id}
                    </button>
                  )}
                  {tone === "superseded" && supersededId && (
                    <span className="ml-2 text-gray-500">(superseded by #{supersededId})</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
