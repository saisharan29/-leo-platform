import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa";

export const metadata: Metadata = {
  title: { default: "Léo — Learn French", template: "%s · Léo" },
  description:
    "Learn French from A1 to C1 with structured lessons, spaced repetition, and honest progress tracking.",
  applicationName: "Léo",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBF7F0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          ADR-001: next/font/google downloads fonts at build time, which this
          build environment blocks. Runtime <link> tags with system fallbacks
          (declared in globals.css) keep the build hermetic.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,800&family=Spline+Sans+Mono:wght@400;500&display=swap"
        />
        <script
          // Apply saved theme before paint to avoid flash
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('leo-theme')==='dark'||(!localStorage.getItem('leo-theme')&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-paper text-ink font-body">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-input focus:bg-bleu focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
