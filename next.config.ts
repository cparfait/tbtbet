import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/uploads/:path*",
          destination: "/api/uploads/:path*",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  // bcryptjs est utilisé côté serveur (auth, bootstrap admin) — on évite de le
  // bundler (sinon webpack avertit qu'il ne résout pas 'crypto').
  serverExternalPackages: ["bcryptjs", "web-push"],
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/**/*", "./prisma/schema.prisma"],
  },
  reactStrictMode: true,
  // bcryptjs émet un `require('crypto')` optionnel que webpack ne résout pas
  // statiquement — inoffensif (crypto est natif Node à l'exécution). On masque
  // l'avertissement cosmétique sans toucher au runtime.
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /node_modules\/bcryptjs/ },
    ];
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // avatars Google
      { protocol: "https", hostname: "flagcdn.com" }, // drapeaux de secours
      { protocol: "https", hostname: "media.api-sports.io" }, // logos API-Football
    ],
  },
};

export default nextConfig;
