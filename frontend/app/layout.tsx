import "./globals.css";
import { Baloo_2, Geist_Mono, Inter_Tight, Instrument_Serif, Outfit } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";

const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", weight: ["400", "500", "600"] });
const serif = Instrument_Serif({ subsets: ["latin"], variable: "--font-instrument", weight: "400", style: ["normal", "italic"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["400", "500", "600", "700"] }); // the landing page
const baloo = Baloo_2({ subsets: ["latin", "devanagari"], variable: "--font-baloo", weight: ["400", "500", "600", "700", "800"] }); // the landing page's one font: rounded and playful

export const metadata = { title: "Drishyya: your idea, your voice, our visuals", description: "Bring a topic. Drishyya plans and scripts your video, prompts you while you record, then adds every visual, edits and cuts the Shorts." };

// Apply the saved theme before first paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t&&t!=='system')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable} ${outfit.variable} ${baloo.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
