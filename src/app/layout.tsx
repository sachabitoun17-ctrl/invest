import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BIS Invest",
  description: "Outil d'analyse immobilière — Sacha, Ilanna & Benjamin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} h-full overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}
