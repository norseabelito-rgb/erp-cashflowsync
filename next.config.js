/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "cdn.dsmcdn.com",  // Trendyol CDN
      },
      {
        protocol: "https",
        hostname: "*.dsmcdn.com",  // Alte subdomenii Trendyol
      },
    ],
  },
};

module.exports = nextConfig;
