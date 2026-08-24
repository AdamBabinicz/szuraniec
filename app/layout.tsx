import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Stałe SEO - Tytuł: 50 znaków, Opis: 150 znaków
const SEO = {
  title: "Dwa na Jeden: Naucz się Szurańca na Polskie Wesele",
  description:
    "Szuraniec to weselny hit! Poznaj kroki taneczne krok po kroku. Interaktywny kurs disco polo z muzyką. Zaskocz gości i zostań królem każdego parkietu!!!",
  url: "https://dwanajeden.pl",
  ogImage: "/images/4.png",
};

export const metadata: Metadata = {
  title: SEO.title,
  description: SEO.description,
  metadataBase: new URL(SEO.url),
  alternates: {
    canonical: "/",
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dwa na Jeden",
  },
  openGraph: {
    title: SEO.title,
    description: SEO.description,
    url: SEO.url,
    siteName: "Dwa na Jeden — Trener Tańca",
    locale: "pl_PL",
    type: "website",
    images: [
      {
        url: SEO.ogImage,
        width: 1200,
        height: 630,
        alt: SEO.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.title,
    description: SEO.description,
    images: [SEO.ogImage],
  },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#111629" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Dane strukturalne JSON-LD (Schema.org)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Dwa na Jeden",
    description: SEO.description,
    applicationCategory: "EducationalApplication",
    genre: "Dance",
    operatingSystem: "Android, iOS, Windows, macOS",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "PLN",
    },
  };

  return (
    <html lang="pl" suppressHydrationWarning className="bg-background">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${outfit.className} ${jetBrainsMono.variable} antialiased`}
      >
        {children}
        <ScrollToTop />
      </body>
    </html>
  );
}
