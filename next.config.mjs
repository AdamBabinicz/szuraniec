/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const ContentSecurityPolicy = [
  "default-src 'self'",
  // Skrypty: 'unsafe-inline' + 'unsafe-eval' dla Next.js (devtools, hydration),
  // YT iframe_api dla YouTube Player.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com",
  "style-src 'self' 'unsafe-inline'",
  // Obrazy: miniatury YouTube + data URIs dla avatar/inline.
  "img-src 'self' data: blob: https://i.ytimg.com https://*.ytimg.com",
  "font-src 'self' data:",
  // Media: streamy wideo YT (googlevideo to realna domena medialna).
  "media-src 'self' blob: https://www.youtube.com https://www.youtube-nocookie.com https://*.googlevideo.com",
  // KLUCZ DLA TWOJEGO BUGU: allowlista originów iframe.
  // Bez tego iframe YT nie renderuje się i zostaje czarny prostokąt.
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  // postMessage z iframe YT biegnie po connect-src.
  "connect-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const PermissionsPolicy = [
  "accelerometer=()",
  "autoplay=(self)",
  "camera=()",
  "clipboard-read=(self)",
  "clipboard-write=(self)",
  "encrypted-media=(self)",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "microphone=()",
  "picture-in-picture=(self)",
  "publickey-credentials-get=(self)",
  "screen-wake-lock=()",
  "web-share=()",
].join(", ");

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    // Next.js 15+: allowlist jakości przekazywanych do <Image quality={...}/>.
    // Bez tej listy Next rzuca "invalid quality prop" dla 75/85.
    qualities: [75, 85],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy.replace(
              "'unsafe-inline' 'unsafe-eval'",
              isProd ? "'unsafe-inline'" : "'unsafe-inline' 'unsafe-eval'",
            ),
          },
          { key: "Permissions-Policy", value: PermissionsPolicy },
          // Blokujemy COEP/COOP — w połączeniu z YouTube iframe powodują
          // dokładnie ten sam objaw (czarny iframe) nawet przy poprawnym CSP,
          // bo iframe YT nie wysyła nagłówka `Cross-Origin-Resource-Policy`.
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
