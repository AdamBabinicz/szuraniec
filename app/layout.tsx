import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { WebMCPTools } from "@/components/webmcp-provider";
import "./globals.css";

const GTM_ID = "GTM-N74LH3ML";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
});

// Stałe SEO - Tytuł: 50 znaków, Opis: 150 znaków
const SEO = {
  title: "Dwa na Jeden: Naucz się Szurańca na Polskie Wesele",
  description:
    "Szuraniec to weselny hit! Poznaj kroki taneczne krok po kroku. Interaktywny kurs disco polo z muzyką. Zaskocz gości i zostań królem każdego parkietu!!!",
  url: "https://dwanajeden.netlify.app",
  ogImage: "/images/1_.png",
  brandName: "Dwa na Jeden — Szkoła Weselnego Kroku",
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
      {
        url: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SEO.url}/#organization`,
        name: SEO.brandName,
        url: SEO.url,
        logo: `${SEO.url}${SEO.ogImage}`,
        description: SEO.description,
      },
      {
        "@type": "WebApplication",
        "@id": `${SEO.url}/#webapp`,
        name: "Dwa na Jeden",
        url: SEO.url,
        description: SEO.description,
        applicationCategory: "EducationalApplication",
        genre: "Dance",
        operatingSystem: "Android, iOS, Windows, macOS",
        publisher: {
          "@id": `${SEO.url}/#organization`,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "PLN",
        },
      },
    ],
  };

  return (
    <html
      lang="pl"
      suppressHydrationWarning
      className={`${outfit.variable} ${jetBrainsMono.variable} bg-background font-sans`}
    >
      <head>
        {/* Poprawny preconnect z atrybutem crossOrigin */}
        <link
          rel="preconnect"
          href="https://www.youtube-nocookie.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://www.youtube-nocookie.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />

        {/* Preload obrazu LCP */}
        <link
          rel="preload"
          as="image"
          href="/images/4.avif"
          type="image/avif"
          fetchPriority="high"
        />
      </head>
      <body className="antialiased">
        {/* Domyślny stan Google Consent Mode v2 */}
        <Script
          id="google-consent-default"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'wait_for_update': 500
              });
            `,
          }}
        />

        {/* Google Tag Manager ładowany w bezczynności procesora */}
        <Script
          id="google-tag-manager"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />

        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
          />
        </noscript>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {children}
        <WebMCPTools />
        <ScrollToTop />
      </body>
    </html>
  );
}
