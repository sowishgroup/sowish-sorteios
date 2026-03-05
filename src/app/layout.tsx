import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sowish Sorteios",
  description: "Plataforma de sorteios para Instagram",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-[#405DE6] via-[#C13584] to-[#FEDA77] text-slate-50 min-h-screen`}
      >
        <div className="min-h-screen bg-slate-950/70 backdrop-blur-xl">
          {children}
        </div>
      </body>
    </html>
  );
}
