import type { Metadata } from "next";
import VoiceFilterLayoutClient from "./VoiceFilterLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Voice Filter",
    default: "Annix Voice Filter",
  },
  description: "Annix voice filter and call management",
};

export default function VoiceFilterLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <VoiceFilterLayoutClient>{children}</VoiceFilterLayoutClient>;
}
