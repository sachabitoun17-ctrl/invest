import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "BIS Project — Investissement Immobilier",
  description: "Outil d'analyse immobilière — Sacha, Ilanna & Benjamin",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className="h-full overflow-hidden font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
