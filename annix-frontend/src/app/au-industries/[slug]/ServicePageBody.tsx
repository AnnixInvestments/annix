"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUpdateAuIndustriesPage } from "@/app/lib/query/hooks";
import { useEditMode } from "../context/EditModeContext";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface ServicePageBodyProps {
  pageId: string;
  initialContent: string;
  children: React.ReactNode;
}

export function ServicePageBody(props: ServicePageBodyProps) {
  const { editMode } = useEditMode();
  const { mutateAsync: updatePage, isPending: saving } = useUpdateAuIndustriesPage();
  const router = useRouter();
  const [editContent, setEditContent] = useState(props.initialContent);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (!editMode) {
    return <>{props.children}</>;
  }

  const hasChanges = editContent !== props.initialContent;

  const handleSave = async () => {
    setSaveMessage(null);
    try {
      await updatePage({ id: props.pageId, content: editContent });
      setSaveMessage("Saved");
      router.refresh();
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      setSaveMessage("Failed to save");
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Editing markdown content — changes are saved directly to the live site
        </p>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span
              className={`text-sm font-medium ${saveMessage === "Saved" ? "text-green-600" : "text-red-600"}`}
            >
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#8A6608] rounded hover:bg-[#6E5106] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <div data-color-mode="light">
        <MDEditor
          value={editContent}
          onChange={(val) => setEditContent(val || "")}
          height={600}
          preview="live"
        />
      </div>
    </div>
  );
}
