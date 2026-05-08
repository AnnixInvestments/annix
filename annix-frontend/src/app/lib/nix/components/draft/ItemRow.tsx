"use client";

import { isNumber, isString } from "es-toolkit/compat";
import { CodesCell } from "./CodesCell";
import { EditableCell } from "./EditableCell";
import type { SpecLookup } from "./useSpecLookup";

/**
 * Renders a single drawing-extracted item as a table row with
 * click-to-edit cells for description / quantity / codes. The codes
 * column resolves each code (R1, SC1, "Linatex Linard 60") against
 * the session's spec extractions via the SpecLookup, surfacing the
 * spec summary inline and making each code clickable to jump to the
 * defining spec page.
 */
export function ItemRow(props: {
  item: Record<string, unknown>;
  index: number;
  extractionId: number;
  specLookup: SpecLookup;
  onSaved: () => void;
  onJumpToSpec: (extractionId: number, page: number | null, searchHint: string | null) => void;
}) {
  const { item, index, extractionId, specLookup, onSaved, onJumpToSpec } = props;
  const itemNumber = item.itemNumber;
  const itemMark = item.mark;
  let mark: string = "—";
  if (isString(itemNumber) && itemNumber.length > 0) mark = itemNumber;
  else if (isString(itemMark) && itemMark.length > 0) mark = itemMark;
  const itemNumberKey = isString(itemNumber) && itemNumber.length > 0 ? itemNumber : undefined;

  const rawDescription = item.description;
  const description = isString(rawDescription) ? rawDescription : "";

  const rawQuantity = item.quantity;
  let quantity = 1;
  if (isNumber(rawQuantity)) {
    quantity = rawQuantity;
  } else if (rawQuantity !== undefined && rawQuantity !== null) {
    const parsed = Number(rawQuantity);
    quantity = Number.isFinite(parsed) ? parsed : 1;
  }

  const itemDiameter = item.diameter;
  const itemNb = item.nb;
  const diameter = itemDiameter ? itemDiameter : itemNb;

  const itemWt = item.wt;
  const itemWallThickness = item.wallThickness;
  const wallThickness = itemWallThickness ? itemWallThickness : itemWt;

  const itemLength = item.length;
  const itemLengthMm = item.lengthMm;
  const itemOverallLengthMm = item.overallLengthMm;
  const length = itemLength ? itemLength : itemLengthMm ? itemLengthMm : itemOverallLengthMm;

  const dimensionParts: string[] = [];
  if (diameter !== undefined && diameter !== null) dimensionParts.push(`NB ${String(diameter)}`);
  if (wallThickness !== undefined && wallThickness !== null)
    dimensionParts.push(`WT ${String(wallThickness)}`);
  if (length !== undefined && length !== null) dimensionParts.push(`L ${String(length)}`);
  const dimensions = dimensionParts.join(" × ");

  const rowKey = { itemNumber: itemNumberKey, index };

  const coating = isString(item.coatingSystem) ? (item.coatingSystem as string) : "";
  const lining = isString(item.liningType) ? (item.liningType as string) : "";
  const materialClass = isString(item.materialClass) ? (item.materialClass as string) : "";
  const flangeConfig = isString(item.flangeConfig) ? (item.flangeConfig as string) : "";

  return (
    <tr className="border-b border-gray-100">
      <td className="py-1 pr-3 font-mono text-gray-700">{mark}</td>
      <td className="py-1 pr-3 text-gray-900 max-w-md">
        <EditableCell
          extractionId={extractionId}
          rowKey={rowKey}
          field="description"
          value={description}
          onSaved={onSaved}
        />
      </td>
      <td className="py-1 pr-3 text-gray-900">
        <EditableCell
          extractionId={extractionId}
          rowKey={rowKey}
          field="quantity"
          value={String(quantity)}
          onSaved={onSaved}
          numeric
        />
      </td>
      <td className="py-1 pr-3 text-gray-700">{dimensions || "—"}</td>
      <td className="py-1 pr-3 text-gray-700">
        <CodesCell
          extractionId={extractionId}
          rowKey={rowKey}
          coating={coating}
          lining={lining}
          materialClass={materialClass}
          flangeConfig={flangeConfig}
          specLookup={specLookup}
          onSaved={onSaved}
          onJumpToSpec={onJumpToSpec}
        />
      </td>
    </tr>
  );
}
