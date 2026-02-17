"use client";

import { useCallback, useState } from "react";
import { NixChatPanel } from "./NixChatPanel";
import NixFloatingAvatar from "./NixFloatingAvatar";

type PortalContext = "customer" | "supplier" | "admin" | "general";

interface NixAssistantProps {
  context?: PortalContext;
}

export function NixAssistant({ context = "general" }: NixAssistantProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const handleOpenChat = useCallback(() => {
    setIsChatOpen(true);
  }, []);

  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const handleSessionCreated = useCallback((newSessionId: number) => {
    setSessionId(newSessionId);
  }, []);

  return (
    <>
      <NixFloatingAvatar isVisible={!isChatOpen} onOpenChat={handleOpenChat} />

      {isChatOpen && (
        <NixChatPanel
          sessionId={sessionId}
          onClose={handleCloseChat}
          onSessionCreated={handleSessionCreated}
          portalContext={context}
        />
      )}
    </>
  );
}
