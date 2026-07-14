import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works | GrindProof",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
