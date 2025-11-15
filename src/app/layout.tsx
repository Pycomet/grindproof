import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { AppProvider } from "@/contexts/AppContext";
import { InstallPWA } from "@/components/InstallPWA";
import { UpdateNotification } from "@/components/UpdateNotification";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Grindproof - AI Goal & Routine Assistant",
  description: "Track what you plan. Prove what you did. Get roasted for the gap. The accountability app that actually calls out your BS.",
  manifest: "/manifest.json",
  themeColor: "#09090b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Grindproof",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Grindproof",
    title: "Grindproof - AI Goal & Routine Assistant",
    description: "The accountability app that actually calls out your BS.",
  },
  twitter: {
    card: "summary",
    title: "Grindproof - AI Goal & Routine Assistant",
    description: "The accountability app that actually calls out your BS.",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <TRPCProvider>
          <AppProvider>
            {children}
            <InstallPWA />
            <UpdateNotification />
          </AppProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
