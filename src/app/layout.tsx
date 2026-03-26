import type { Metadata } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const instrumentSerif = localFont({
  src: [
    {
      path: "./fonts/InstrumentSerif-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/InstrumentSerif-Italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
});

const satoshi = localFont({
  src: [
    {
      path: "./fonts/Satoshi-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ColdCraft HQ — Cold Email Systems That Book B2B Meetings",
  description:
    "We build and manage complete cold outreach infrastructure for B2B companies. Dedicated domains, verified data, specialist copywriting. Meetings on your calendar in 3 weeks.",
  openGraph: {
    title: "ColdCraft HQ — Cold Email Systems That Book B2B Meetings",
    description:
      "We build and manage complete cold outreach infrastructure for B2B companies. Dedicated domains, verified data, specialist copywriting. Meetings on your calendar in 3 weeks.",
    url: "https://coldcrafthq.com",
    siteName: "ColdCraft HQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ColdCraft HQ — Cold Email Systems That Book B2B Meetings",
    description:
      "We build and manage complete cold outreach infrastructure for B2B companies. Dedicated domains, verified data, specialist copywriting. Meetings on your calendar in 3 weeks.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${satoshi.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-body antialiased relative">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
