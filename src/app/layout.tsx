import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Diction Coach — Entraînement à la dictée vocale",
  description:
    "Améliorez votre diction avec des exercices progressifs et des speed tests. Méthode Fonetix. Multi-langue (FR/EN/IT/ES/DE).",
  openGraph: {
    title: "Diction Coach — Entraînement à la dictée vocale",
    description:
      "Améliorez votre diction avec des exercices progressifs et des speed tests. Méthode Fonetix. Multi-langue (FR/EN/IT/ES/DE).",
    url: "https://diction.lekibbitz.fr",
    siteName: "Diction Coach",
    images: [
      {
        url: "https://diction.lekibbitz.fr/og-image.png",
        width: 1200,
        height: 630,
        alt: "Diction Coach — Entraînement à la dictée vocale",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
};

// Inline script to apply saved theme before first paint (avoids flash).
// Content is a static constant — no user input involved.
const themeScript = `
(function(){
  var t = localStorage.getItem('theme');
  if (t === 'light') document.documentElement.classList.remove('dark');
  else document.documentElement.classList.add('dark');
})()
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
