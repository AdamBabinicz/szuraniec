import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://dwanajeden.netlify.app";
  const lastModified = new Date();

  return [
    // Strona główna
    {
      url: baseUrl,
      lastModified: lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    // Strony prawne - Polski
    {
      url: `${baseUrl}/polityka-prywatnosci`,
      lastModified: lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/regulamin`,
      lastModified: lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // Strony prawne - Angielski
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
