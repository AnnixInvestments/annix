"use client";

import { useState } from "react";
import { CodeChip } from "./CodeChip";
import { CodesEditor } from "./CodesEditor";
import type { SpecLookup } from "./useSpecLookup";

/**
 * Single drawing-row cell for the bundle of codes / config strings: paint
 * coating, internal lining, material class, flange / end configuration.
 *
 * Default view: chips (resolved against the session's spec extractions when
 * a matching clause was extracted, plain text otherwise). Each resolved chip
 * is clickable to jump to the spec's source page; an 'edit' link toggles
 * into the popup editor. Empty cell shows a clickable dash that opens the
 * editor straight away so the user can fill in a missed code.
 */
export function CodesCell(props: {
  extractionId: number;
  rowKey: { itemNumber?: string; index?: number };
  coating: string;
  lining: string;
  materialClass: string;
  flangeConfig: string;
  specLookup: SpecLookup;
  onSaved: () => void;
  onJumpToSpec: (extractionId: number, page: number | null, searchHint: string | null) => void;
}) {
  const {
    extractionId,
    rowKey,
    coating,
    lining,
    materialClass,
    flangeConfig,
    specLookup,
    onSaved,
    onJumpToSpec,
  } = props;
  const [editing, setEditing] = useState(false);

  // flangeConfig (F.B.E F/F, P.E. etc.) renders alongside the description
  // in ItemRow now — these are end-condition annotations, not 'codes' the
  // spec docs define, so they don't deserve a chip in the codes cell.
  const chips: { code: string; kind: "coating" | "lining" | "materialClass" | "flangeConfig" }[] =
    [];
  if (coating.length > 0) chips.push({ code: coating, kind: "coating" });
  if (lining.length > 0) chips.push({ code: lining, kind: "lining" });
  if (materialClass.length > 0) chips.push({ code: materialClass, kind: "materialClass" });

  if (editing) {
    return (
      <CodesEditor
        extractionId={extractionId}
        rowKey={rowKey}
        coating={coating}
        lining={lining}
        materialClass={materialClass}
        flangeConfig={flangeConfig}
        display=""
        onSaved={() => {
          onSaved();
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  if (chips.length === 0) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded px-1 py-0.5"
        title="Click to add codes"
      >
        —
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {chips.map(({ code, kind }) => (
        <CodeChip
          key={`${kind}-${code}`}
          code={code}
          resolved={specLookup.resolve(code)}
          kind={kind}
          onJumpToSpec={onJumpToSpec}
        />
      ))}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[10px] text-gray-400 hover:text-blue-600 underline ml-1"
        title="Edit codes"
      >
        edit
      </button>
    </div>
  );
}
