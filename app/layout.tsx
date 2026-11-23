import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HireHunt — Real jobs, straight from companies. India-first, fresher-first.",
  description:
    "Real fresher & intern jobs straight from company career pages in India. No reposts, no ghost jobs, plain-language search.",
  openGraph: {
    title: "HireHunt — Real jobs, straight from companies.",
    description: "India-first, fresher-first job aggregator. No reposts, no ghost jobs.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0E0B1D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#0E0B1D] text-[#FFFFFF] min-h-screen font-sans selection:bg-[#5A3B8C] selection:text-[#FFFFFF]">
        {children}
      </body>
    </html>
  );
}
