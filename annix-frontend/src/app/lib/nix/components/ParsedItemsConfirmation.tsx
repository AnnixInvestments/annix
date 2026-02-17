"use client";

import { useState } from "react";
import {
  CreateItemsResponse,
  ItemConfirmation,
  nixChatApi,
  ParsedItem,
  ParsedItemSpecifications,
  ParseItemsResponse,
} from "../chat-api";

interface ParsedItemsConfirmationProps {
  sessionId: number;
  parseResponse: ParseItemsResponse;
  onConfirm: (response: CreateItemsResponse) => void;
  onCancel: () => void;
  rfqTitle?: string;
}

export function ParsedItemsConfirmation({
  sessionId,
  parseResponse,
  onConfirm,
  onCancel,
  rfqTitle,
}: ParsedItemsConfirmationProps) {
  const [confirmations, setConfirmations] = useState<Map<number, ItemConfirmation>>(() => {
    const map = new Map<number, ItemConfirmation>();
    parseResponse.parsedItems.forEach((item, index) => {
      if (item.action === "create_item") {
        map.set(index, { index, confirmed: item.confidence >= 0.7, modifiedSpecs: undefined });
      }
    });
    return map;
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsToCreate = parseResponse.parsedItems.filter((item) => item.action === "create_item");

  const toggleItem = (index: number) => {
    setConfirmations((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(index);
      if (current) {
        newMap.set(index, { ...current, confirmed: !current.confirmed });
      }
      return newMap;
    });
  };

  const updateSpecs = (index: number, specs: Partial<ParsedItemSpecifications>) => {
    setConfirmations((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(index);
      if (current) {
        newMap.set(index, {
          ...current,
          modifiedSpecs: { ...current.modifiedSpecs, ...specs },
        });
      }
      return newMap;
    });
  };

  const handleConfirm = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const confirmationArray = Array.from(confirmations.values());
      const response = await nixChatApi.createItemsFromChat(sessionId, parseResponse.parsedItems, {
        confirmations: confirmationArray,
        rfqTitle,
      });

      if (response.success) {
        onConfirm(response);
      } else {
        setError(response.failedItems?.[0]?.reason || "Failed to create items");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create items");
    } finally {
      setIsCreating(false);
    }
  };

  const confirmedCount = Array.from(confirmations.values()).filter((c) => c.confirmed).length;

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Confirm Items to Create</h3>
        <span className="text-sm text-gray-400">
          {confirmedCount} of {itemsToCreate.length} selected
        </span>
      </div>

      {parseResponse.requiresConfirmation && (
        <p className="text-sm text-amber-400">
          Some items have low confidence or missing fields. Please review before creating.
        </p>
      )}

      <div className="space-y-3">
        {parseResponse.parsedItems.map((item, index) => {
          if (item.action !== "create_item") return null;

          const confirmation = confirmations.get(index);
          const issues = parseResponse.validationIssues?.filter((i) => i.itemIndex === index) || [];
          const hasErrors = issues.some((i) => i.severity === "error");

          return (
            <ParsedItemCard
              key={index}
              item={item}
              index={index}
              isConfirmed={confirmation?.confirmed ?? false}
              onToggle={() => toggleItem(index)}
              onUpdateSpecs={(specs) => updateSpecs(index, specs)}
              modifiedSpecs={confirmation?.modifiedSpecs}
              issues={issues}
              hasErrors={hasErrors}
            />
          );
        })}
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-200 p-3 rounded text-sm">{error}</div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isCreating}
          className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isCreating || confirmedCount === 0}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? "Creating..." : `Create ${confirmedCount} Item${confirmedCount !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

interface ParsedItemCardProps {
  item: ParsedItem;
  index: number;
  isConfirmed: boolean;
  onToggle: () => void;
  onUpdateSpecs: (specs: Partial<ParsedItemSpecifications>) => void;
  modifiedSpecs?: ParsedItemSpecifications;
  issues: Array<{ severity: string; field: string; message: string; suggestion?: string }>;
  hasErrors: boolean;
}

function ParsedItemCard({
  item,
  index,
  isConfirmed,
  onToggle,
  onUpdateSpecs,
  modifiedSpecs,
  issues,
  hasErrors,
}: ParsedItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const specs = { ...item.specifications, ...modifiedSpecs };

  const confidenceColor =
    item.confidence >= 0.8
      ? "text-green-400"
      : item.confidence >= 0.5
        ? "text-amber-400"
        : "text-red-400";

  const itemTypeLabel = item.itemType
    ? item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)
    : "Unknown";

  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        isConfirmed
          ? "border-blue-500 bg-blue-500/10"
          : hasErrors
            ? "border-red-500/50 bg-red-500/5"
            : "border-gray-600 bg-gray-700/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isConfirmed}
          onChange={onToggle}
          disabled={hasErrors}
          className="mt-1 h-4 w-4 rounded border-gray-500 bg-gray-700 text-blue-600 focus:ring-blue-500"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">{itemTypeLabel}</span>
            {specs?.diameter && (
              <span className="text-gray-300">{specs.diameter}NB</span>
            )}
            <span className={`text-xs ${confidenceColor}`}>
              {Math.round(item.confidence * 100)}% confidence
            </span>
          </div>

          <p className="text-sm text-gray-400 mb-2">{item.explanation}</p>

          {!isEditing ? (
            <div className="flex flex-wrap gap-2 text-xs">
              {specs?.schedule && (
                <span className="bg-gray-600 px-2 py-0.5 rounded">{specs.schedule}</span>
              )}
              {specs?.material && (
                <span className="bg-gray-600 px-2 py-0.5 rounded">{specs.material}</span>
              )}
              {specs?.angle && (
                <span className="bg-gray-600 px-2 py-0.5 rounded">{specs.angle}°</span>
              )}
              {specs?.flangeConfig && specs.flangeConfig !== "none" && (
                <span className="bg-gray-600 px-2 py-0.5 rounded">
                  Flanges: {specs.flangeConfig.replace("_", " ")}
                </span>
              )}
              {specs?.quantity && specs.quantity > 1 && (
                <span className="bg-gray-600 px-2 py-0.5 rounded">Qty: {specs.quantity}</span>
              )}
              {specs?.length && (
                <span className="bg-gray-600 px-2 py-0.5 rounded">{specs.length}m</span>
              )}
              {specs?.secondaryDiameter && (
                <span className="bg-gray-600 px-2 py-0.5 rounded">
                  → {specs.secondaryDiameter}NB
                </span>
              )}
            </div>
          ) : (
            <ItemSpecsEditor
              specs={specs}
              itemType={item.itemType}
              onSave={(newSpecs) => {
                onUpdateSpecs(newSpecs);
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          )}

          {issues.length > 0 && (
            <div className="mt-2 space-y-1">
              {issues.map((issue, i) => (
                <div
                  key={i}
                  className={`text-xs ${
                    issue.severity === "error"
                      ? "text-red-400"
                      : issue.severity === "warning"
                        ? "text-amber-400"
                        : "text-blue-400"
                  }`}
                >
                  {issue.message}
                  {issue.suggestion && (
                    <span className="text-gray-400 ml-1">- {issue.suggestion}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!isEditing && !hasErrors && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

interface ItemSpecsEditorProps {
  specs: ParsedItemSpecifications;
  itemType?: string;
  onSave: (specs: Partial<ParsedItemSpecifications>) => void;
  onCancel: () => void;
}

function ItemSpecsEditor({ specs, itemType, onSave, onCancel }: ItemSpecsEditorProps) {
  const [editedSpecs, setEditedSpecs] = useState<ParsedItemSpecifications>(specs);

  const handleChange = (field: keyof ParsedItemSpecifications, value: string | number) => {
    setEditedSpecs((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          <span className="text-gray-400">Diameter (NB)</span>
          <input
            type="number"
            value={editedSpecs.diameter || ""}
            onChange={(e) => handleChange("diameter", parseInt(e.target.value) || 0)}
            className="w-full mt-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
          />
        </label>

        <label className="text-xs">
          <span className="text-gray-400">Schedule</span>
          <input
            type="text"
            value={editedSpecs.schedule || ""}
            onChange={(e) => handleChange("schedule", e.target.value)}
            placeholder="e.g., Sch 40"
            className="w-full mt-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
          />
        </label>

        {itemType === "bend" && (
          <label className="text-xs">
            <span className="text-gray-400">Angle (degrees)</span>
            <input
              type="number"
              value={editedSpecs.angle || ""}
              onChange={(e) => handleChange("angle", parseInt(e.target.value) || 0)}
              className="w-full mt-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
            />
          </label>
        )}

        {itemType === "reducer" && (
          <label className="text-xs">
            <span className="text-gray-400">Outlet (NB)</span>
            <input
              type="number"
              value={editedSpecs.secondaryDiameter || ""}
              onChange={(e) => handleChange("secondaryDiameter", parseInt(e.target.value) || 0)}
              className="w-full mt-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
            />
          </label>
        )}

        {itemType === "pipe" && (
          <label className="text-xs">
            <span className="text-gray-400">Length (m)</span>
            <input
              type="number"
              step="0.1"
              value={editedSpecs.length || ""}
              onChange={(e) => handleChange("length", parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
            />
          </label>
        )}

        <label className="text-xs">
          <span className="text-gray-400">Quantity</span>
          <input
            type="number"
            value={editedSpecs.quantity || 1}
            onChange={(e) => handleChange("quantity", parseInt(e.target.value) || 1)}
            className="w-full mt-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
          />
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-2 py-1 text-xs text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(editedSpecs)}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Save
        </button>
      </div>
    </div>
  );
}
