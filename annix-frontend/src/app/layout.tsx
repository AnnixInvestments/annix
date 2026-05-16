import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Great_Vibes } from "next/font/google";
import "./globals.css";
import ConditionalNavigation from "./components/ConditionalNavigation";
import { Providers } from "./components/Providers";
import SessionExpiredModal from "./components/SessionExpiredModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Secondary fonts: not preloaded — geist-mono is only used inside the apps
// and great-vibes only in Annix branding, so preloading them render-blocked
// every page (including the public marketing site) for nothing.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

// Annix App signature font - elegant cursive for branding
const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

export const metadata: Metadata = {
  title: "Annix App - RFQ System",
  description: "Annix App Request for Quotation Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Annix App",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
  viewportFit: "cover",
};

export default function RootLayout(
  props: Readonly<{
    children: React.ReactNode;
  }>,
) {
  const { children } = props;
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${greatVibes.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <ConditionalNavigation />
          {children}
          <SessionExpiredModal />
        </Providers>
      </body>
    </html>
  );
}
