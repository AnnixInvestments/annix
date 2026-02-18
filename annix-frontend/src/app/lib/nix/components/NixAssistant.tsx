"use client";

import { useCallback, useState } from "react";
import { NixChatPanel } from "./NixChatPanel";
import { NixErrorBoundary } from "./NixErrorBoundary";
import NixFloatingAvatar from "./NixFloatingAvatar";

type PortalContext = "customer" | "supplier" | "admin" | "general";

interface PageContext {
  currentPage: string;
  rfqType?: string;
  portalContext: PortalContext;
}

interface NixAssistantProps {
  context?: PortalContext;
  pageContext?: PageContext;
}

export function NixAssistant({ context = "general", pageContext }: NixAssistantProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  const handleOpenChat = useCallback(() => {
    setIsChatOpen(true);
  }, []);

  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const handleSessionCreated = useCallback((newSessionId: number) => {
    setSessionId(newSessionId);
  }, []);

  const handleErrorReset = useCallback(() => {
    setErrorKey((prev) => prev + 1);
  }, []);

  return (
    <>
      <NixFloatingAvatar isVisible={!isChatOpen} onOpenChat={handleOpenChat} />

      {isChatOpen && (
        <NixErrorBoundary key={errorKey} onReset={handleErrorReset}>
          <NixChatPanel
            sessionId={sessionId}
            onClose={handleCloseChat}
            onSessionCreated={handleSessionCreated}
            portalContext={context}
            pageContext={pageContext ?? { currentPage: "General Portal", portalContext: context }}
          />
        </NixErrorBoundary>
      )}
    </>
  );
}
