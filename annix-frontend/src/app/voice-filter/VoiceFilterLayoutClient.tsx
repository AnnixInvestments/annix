"use client";

import { VoiceFilterAuthProvider } from "@/app/context/VoiceFilterAuthContext";

export default function VoiceFilterLayoutClient(props: { children: React.ReactNode }) {
  const { children } = props;
  return <VoiceFilterAuthProvider>{children}</VoiceFilterAuthProvider>;
}
