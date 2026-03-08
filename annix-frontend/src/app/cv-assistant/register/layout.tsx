import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return children;
}
