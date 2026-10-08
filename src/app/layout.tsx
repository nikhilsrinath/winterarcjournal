import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Figtree, Unbounded } from "next/font/google";
import "./globals.css";
import { Header, MobileNav } from "@/components/nav";
import { TzSync } from "@/components/tz-sync";

const display = Unbounded({ subsets: ["latin"], weight: ["600", "800", "900"], variable: "--font-unbounded" });
const body = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: { default: "WinterArc Journal — a public daily log", template: "%s — WinterArc" },
  description: "Log what you did today. See what the world did on any day. Build a streak.",
  applicationName: "WinterArc Journal",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3fa" },
    { media: "(prefers-color-scheme: dark)", color: "#050a17" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `try{var t=localStorage.getItem('wa_theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="pb-28 md:pb-0">
        <TzSync />
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 md:px-8">{children}</main>
        <footer className="mx-auto mt-20 hidden w-full max-w-6xl px-4 py-8 text-sm text-mute md:block md:px-8">
          WinterArc Journal. Every entry is public. Log one thing a day and keep the streak going.
        </footer>
        <MobileNav />
      </body>
    </html>
  );
}
