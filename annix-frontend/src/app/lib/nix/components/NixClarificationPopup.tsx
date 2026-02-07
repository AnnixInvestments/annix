"use client";

import Image from "next/image";
import { useState } from "react";
import type { NixClarificationDto } from "../api";

interface NixClarificationPopupProps {
  clarification: NixClarificationDto | null;
  totalClarifications: number;
  currentIndex: number;
  onSubmit: (clarificationId: number, response: string) => void;
  onSkip: (clarificationId: number) => void;
  onClose: () => void;
}

export default function NixClarificationPopup({
  clarification,
  totalClarifications,
  currentIndex,
  onSubmit,
  onSkip,
  onClose,
}: NixClarificationPopupProps) {
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!clarification) return null;

  const handleSubmit = async () => {
    if (!response.trim()) return;
    setIsSubmitting(true);
    await onSubmit(clarification.id, response.trim());
    setResponse("");
    setIsSubmitting(false);
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    await onSkip(clarification.id);
    setResponse("");
    setIsSubmitting(false);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await onSubmit(clarification.id, "Confirmed - correct as extracted");
    setResponse("");
    setIsSubmitting(false);
  };

  const ctx = clarification.context;
  const isSpecHeader = ctx.isSpecificationHeader;

  return (
    <div className="fixed inset-x-0 top-16 bottom-16 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300 max-h-full flex flex-col">
        <div
          className="px-4 py-2 flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: "#323288" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-400 flex-shrink-0">
              <Image
                src="/nix-avatar.png"
                alt="Nix"
                width={40}
                height={40}
                className="object-cover object-top scale-125"
              />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                {isSpecHeader ? "Nix found a specification header" : "Nix needs your help"}
              </h3>
              <p className="text-white/70 text-xs">
                Question {currentIndex + 1} of {totalClarifications}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 overflow-y-auto flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {isSpecHeader && ctx.cellRef && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                Specification {ctx.cellRef}
              </span>
            )}
            {!isSpecHeader && ctx.rowNumber && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                Row {ctx.rowNumber}
              </span>
            )}
            {ctx.itemNumber && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                {ctx.itemNumber}
              </span>
            )}
            {ctx.itemType && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs capitalize">
                {ctx.itemType}
              </span>
            )}
          </div>

          {ctx.itemDescription && !isSpecHeader && (
            <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-800 text-xs font-mono line-clamp-2">{ctx.itemDescription}</p>
            </div>
          )}

          <p className="text-gray-800 text-sm mb-3 whitespace-pre-line">{clarification.question}</p>

          {!isSpecHeader && (ctx.extractedMaterial || ctx.extractedDiameter) && (
            <div className="mb-3 p-2 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {ctx.extractedMaterial && (
                  <span>
                    <span className="text-gray-500">Material:</span>{" "}
                    <span className="font-medium">{ctx.extractedMaterial}</span>
                  </span>
                )}
                {ctx.extractedDiameter && (
                  <span>
                    <span className="text-gray-500">Dia:</span>{" "}
                    <span className="font-medium">{ctx.extractedDiameter}mm</span>
                  </span>
                )}
                {ctx.extractedLength && (
                  <span>
                    <span className="text-gray-500">Len:</span>{" "}
                    <span className="font-medium">{ctx.extractedLength}mm</span>
                  </span>
                )}
                {ctx.extractedAngle && (
                  <span>
                    <span className="text-gray-500">Angle:</span>{" "}
                    <span className="font-medium">{ctx.extractedAngle}°</span>
                  </span>
                )}
                {ctx.extractedQuantity && (
                  <span>
                    <span className="text-gray-500">Qty:</span>{" "}
                    <span className="font-medium">{ctx.extractedQuantity}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder={
              isSpecHeader ? "Provide the missing specification details..." : "Type your answer..."
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0 bg-white">
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1 py-2 px-3 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
            >
              Skip
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 py-2 px-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50 hover:opacity-90 text-sm bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Confirming..." : "Yes, Correct"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !response.trim()}
              className="flex-1 py-2 px-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50 hover:opacity-90 text-sm"
              style={{ backgroundColor: "#FFA500" }}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>

        <div className="h-1 flex-shrink-0" style={{ backgroundColor: "#FFA500" }} />
      </div>
    </div>
  );
}
