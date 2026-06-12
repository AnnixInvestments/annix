"use client";

import { useCallback, useState } from "react";
import { log } from "@/app/lib/logger";
import { type NixDocumentRole, nixApi } from "../../api";

export type SmartRoleSource = "filename" | "ai" | "fallback" | "user";

export interface SmartPendingDocument {
  id: string;
  file: File;
  role: NixDocumentRole;
  roleSource: SmartRoleSource;
  roleReason: string;
  classifying: boolean;
}

const documentId = (file: File): string => `${file.name}-${file.size}-${file.lastModified}`;

// Classification state for the unified dropzone (issue #266).
// Cheap-first: the filename heuristic answers instantly; only an
// ambiguous guess pays for the AI content glance, and a user
// override ("user" source) is never overwritten by a late AI result.
export function useSmartDocuments() {
  const [documents, setDocuments] = useState<SmartPendingDocument[]>([]);

  const applyClassification = useCallback(
    (
      id: string,
      classification: { role: NixDocumentRole; source: SmartRoleSource; reason: string },
      stillClassifying: boolean,
    ) => {
      setDocuments((prev) =>
        prev.map((doc) => {
          if (doc.id !== id || doc.roleSource === "user") return doc;
          return {
            ...doc,
            role: classification.role,
            roleSource: classification.source,
            roleReason: classification.reason,
            classifying: stillClassifying,
          };
        }),
      );
    },
    [],
  );

  const addFile = useCallback(
    (file: File) => {
      const id = documentId(file);
      setDocuments((prev) => {
        if (prev.some((doc) => doc.id === id)) return prev;
        return [
          ...prev,
          {
            id,
            file,
            role: "other",
            roleSource: "fallback",
            roleReason: "classifying…",
            classifying: true,
          },
        ];
      });

      void nixApi
        .classifyRole(file.name)
        .then((byName) => {
          const ambiguous = byName.source === "fallback";
          applyClassification(
            id,
            { role: byName.role, source: byName.source, reason: byName.reason },
            ambiguous,
          );
          if (!ambiguous) return null;
          return nixApi.classifyRoleContent(file).then((byContent) => {
            applyClassification(
              id,
              { role: byContent.role, source: byContent.source, reason: byContent.reason },
              false,
            );
          });
        })
        .catch((error) => {
          log.warn(`Role classification failed for ${file.name}:`, error);
          applyClassification(
            id,
            { role: "other", source: "fallback", reason: "classification unavailable" },
            false,
          );
        });
    },
    [applyClassification],
  );

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  }, []);

  const reclassify = useCallback((id: string, role: NixDocumentRole) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? { ...doc, role, roleSource: "user", roleReason: "manually set", classifying: false }
          : doc,
      ),
    );
  }, []);

  const reset = useCallback(() => setDocuments([]), []);

  return { documents, addFile, removeDocument, reclassify, reset };
}
