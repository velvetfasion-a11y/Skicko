import type { NextConfig } from "next";

if (!process.env.DATABASE_URL_UNPOOLED?.trim() && process.env.DATABASE_URL) {
  process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["bcryptjs", "juice", "@prisma/client"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
