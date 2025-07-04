import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { EB_Garamond, Crimson_Pro } from 'next/font/google';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({ subsets: ['latin'], variable: '--font-eb-garamond', display: 'swap' });
const crimsonPro = Crimson_Pro({ subsets: ['latin'], variable: '--font-crimson-pro', display: 'swap' });

export const metadata: Metadata = {
  title: "AztecGuild",
  description: "Become a member of the Aztec Guild, hone your craft and show off your allegiances.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} ${crimsonPro.variable} antialiased`}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
