/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const ContentSecurityPolicy = [
  "default-src 'self'",
  // Skrypty: Next.js (inline+eval), YouTube iframe_api, GTM, GA4, Ads.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
    "https://www.youtube.com https://www.youtube-nocookie.com " +
    "https://www.googletagmanager.com https://*.googletagmanager.com " +
    "https://*.google-analytics.com https://*.analytics.google.com " +
    "https://*.g.doubleclick.net https://www.google.com https://*.google.com",
  // style-src dla GTM (preview mode korzysta z inline stylów).
  "style-src 'self' 'unsafe-inline' " +
    "https://www.googletagmanager.com https://tagmanager.google.com",
  // Miniatury YouTube i Google (UI, beacon, raporty).
  "img-src 'self' data: blob: " +
    "https://i.ytimg.com https://*.ytimg.com " +
    "https://www.googletagmanager.com https://*.googletagmanager.com " +
    "https://ssl.gstatic.com https://*.gstatic.com " +
    "https://*.google-analytics.com https://*.g.doubleclick.net " +
    "https://*.google.com https://pagead2.googlesyndication.com",
  // Czcionki dla GTM preview mode.
  "font-src 'self' data: https://fonts.gstatic.com",
  // Realne strumienie wideo YT biegną z *.googlevideo.com.
  "media-src 'self' blob: " +
    "https://www.youtube.com https://www.youtube-nocookie.com " +
    "https://*.googlevideo.com",
  // KLUCZOWE: YouTube embed + GTM iframe (noscript/pixel GA) + Ads.
  "frame-src 'self' " +
    "https://www.youtube.com https://www.youtube-nocookie.com " +
    "https://www.googletagmanager.com https://tagmanager.google.com " +
    "https://www.google.com",
  // postMessage z iframe YT i raporty GA4/Ads.
  "connect-src 'self' " +
    "https://www.youtube.com https://www.youtube-nocookie.com " +
    "https://www.googletagmanager.com https://*.googletagmanager.com " +
    "https://*.google-analytics.com https://*.analytics.google.com " +
    "https://*.g.doubleclick.net https://www.google.com https://*.google.com " +
    "https://pagead2.googlesyndication.com " +
    "https://www.googleadservices.com https://googleads.g.doubleclick.net",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const PermissionsPolicy = [
  // Odblokowane delegowanie uprawnień do cross-origin iframe YouTube (rozwiązuje czarny ekran na produkcji)
  'picture-in-picture=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
  'autoplay=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
  'encrypted-media=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
  'fullscreen=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
  // Wymagane przez GTM/GA do własnych pomiarów.
  "clipboard-read=(self)",
  "clipboard-write=(self)",
  "publickey-credentials-get=(self)",
  "web-share=(self)",
  // Reszta — domyślnie blokowana
  "accelerometer=()",
  "camera=()",
  "geolocation=()",
  "gyroscope=()",
  "microphone=()",
  "screen-wake-lock=()",
].join(", ");

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    // Next.js 15+: allowlista jakości dla <Image quality={…}>.
    qualities: [75, 85],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
          },
          { key: "Permissions-Policy", value: PermissionsPolicy },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
