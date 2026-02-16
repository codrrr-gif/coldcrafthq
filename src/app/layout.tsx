import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ColdCraft HQ — We Book B2B Sales Meetings So You Can Close",
  description:
    "ColdCraft HQ is a B2B lead generation agency that books qualified sales meetings using cold email outreach. Fill your pipeline on autopilot.",
  openGraph: {
    title: "ColdCraft HQ — We Book B2B Sales Meetings So You Can Close",
    description:
      "ColdCraft HQ is a B2B lead generation agency that books qualified sales meetings using cold email outreach. Fill your pipeline on autopilot.",
    url: "https://coldcrafthq.com",
    siteName: "ColdCraft HQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ColdCraft HQ — We Book B2B Sales Meetings So You Can Close",
    description:
      "ColdCraft HQ is a B2B lead generation agency that books qualified sales meetings using cold email outreach. Fill your pipeline on autopilot.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
