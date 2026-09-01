/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
    qualities: [75, 85],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async redirects() {
    return [
      {
        source: "/privacy",
        destination: "/privacy-policy",
        permanent: true,
      },
      {
        source: "/polityka",
        destination: "/polityka-prywatnosci",
        permanent: true,
      },
      {
        source: "/terms",
        destination: "/terms-of-service",
        permanent: true,
      },
      {
        source: "/tos",
        destination: "/terms-of-service",
        permanent: true,
      },
    ];
  },
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.youtube.com https://www.youtube-nocookie.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://www.googletagmanager.com *.google-analytics.com;
      font-src 'self' data:;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-src https://www.youtube.com https://www.youtube-nocookie.com;
      connect-src 'self' *.google-analytics.com https://www.google-analytics.com https://www.googletagmanager.com https://www.youtube.com https://www.youtube-nocookie.com;
      worker-src 'self' blob:;
      upgrade-insecure-requests;
      frame-ancestors 'none';
    `
      .replace(/\s{2,}/g, " ")
      .trim();

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=(self)",
              "geolocation=()",
              'autoplay=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
              'encrypted-media=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
              'picture-in-picture=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
              'fullscreen=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
            ].join(", "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
