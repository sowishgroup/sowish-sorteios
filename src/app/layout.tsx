import type { Metadata } from "next";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppMenu from "@/components/AppMenu";

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
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-slate-900 min-h-screen relative`}
      >
        {/* Imagem de fundo em todo o aplicativo */}
        <div className="fixed inset-0 z-0 bg-slate-200" aria-hidden>
          <Image
            src="/background.png"
            alt=""
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/15" />
        </div>
        <div className="relative z-10 min-h-screen">
          <AppMenu>{children}</AppMenu>
        </div>
      </body>
    </html>
  );
}
