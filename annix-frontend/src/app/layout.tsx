import type { Metadata, Viewport } from "next";
import { Exo_2, Geist, Geist_Mono, Great_Vibes, Inter } from "next/font/google";
import "./globals.css";
import ConditionalNavigation from "./components/ConditionalNavigation";
import { GlobalBrandBackground } from "./components/GlobalBrandBackground";
import { Providers } from "./components/Providers";
import DevServiceWorkerCleanup from "./components/pwa/DevServiceWorkerCleanup";
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

// Annix Orbit display font — ANNIX wordmark (ExtraBold 800) + ORBIT (SemiBold 600).
// Loaded but not preloaded so the public marketing site stays render-fast; the
// Orbit module pages declare a hard preload via their own layout when needed.
const exo2 = Exo_2({
  variable: "--font-exo-2",
  subsets: ["latin"],
  weight: ["600", "800"],
  preload: false,
});

// Annix Orbit body font — HIRING • TALENT • COMPLIANCE row + description.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Annix App - RFQ System",
  description: "Annix App Request for Quotation Management System",
  manifest: "/manifest.json",
  // Global Annix favicon (the orbital-AN brand mark) so every tab shows it
  // consistently. Per-app layouts (e.g. Annix Orbit) may still override.
  icons: {
    icon: [{ url: "/branding/annix-orbit-icon.png", type: "image/png", sizes: "any" }],
    apple: "/branding/annix-orbit-icon.png",
  },
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
        className={`${geistSans.variable} ${geistMono.variable} ${greatVibes.variable} ${exo2.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <DevServiceWorkerCleanup />
          <GlobalBrandBackground />
          <ConditionalNavigation />
          {children}
          <SessionExpiredModal />
        </Providers>
      </body>
    </html>
  );
}
