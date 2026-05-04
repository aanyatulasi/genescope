import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeneScope — AI-powered gene explorer",
  description:
    "Educational gene explanations powered by Claude. Enter a gene and explore its biology, disease links, and biotech relevance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="min-h-screen font-sans text-slate-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
