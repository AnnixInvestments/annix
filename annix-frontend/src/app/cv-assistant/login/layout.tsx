import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return children;
}
