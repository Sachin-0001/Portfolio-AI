import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

// Absolute base for Open Graph URLs: explicit override, else Vercel's production domain, else local dev
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const description =
  "Sachin Suresh builds agentic AI systems, RAG pipelines and ML-driven products end to end. Explore the work, or ask the portfolio's AI assistant.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Sachin Suresh | AI / ML Engineer",
  description,
  openGraph: {
    type: "website",
    siteName: "Sachin Suresh",
    title: "Sachin Suresh | AI / ML Engineer",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sachin Suresh | AI / ML Engineer",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#08090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
