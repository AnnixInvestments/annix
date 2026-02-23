"use client";

import { VoiceFilterAuthProvider } from "@/app/context/VoiceFilterAuthContext";

export default function VoiceFilterLayoutClient({ children }: { children: React.ReactNode }) {
  return <VoiceFilterAuthProvider>{children}</VoiceFilterAuthProvider>;
}
