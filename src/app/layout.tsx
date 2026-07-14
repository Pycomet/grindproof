import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

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
  metadataBase: new URL("https://www.grindproof.co"),
  title: "GrindProof - AI Accountability Coach",
  description:
    "Track what you plan. Prove what you did. Get roasted for the gap.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GrindProof",
  },
  openGraph: {
    type: "website",
    siteName: "GrindProof",
    title: "GrindProof - AI Accountability Coach",
    description: "The accountability app that actually calls out your BS.",
    images: [
      {
        url: "/grindproof-promo-poster.jpg",
        width: 1920,
        height: 1080,
        alt: "GrindProof: promise a 5am wake-up, get roasted for the gap",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GrindProof - AI Accountability Coach",
    description: "The accountability app that actually calls out your BS.",
    images: ["/grindproof-promo-poster.jpg"],
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
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script — applies saved theme class before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('grindproof:theme');if(t==='dark')document.documentElement.classList.add('dark');else if(t==='light')document.documentElement.classList.add('light');}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
