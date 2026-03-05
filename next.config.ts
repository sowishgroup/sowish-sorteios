import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "scontent.cdninstagram.com", pathname: "/**" },
      { protocol: "https", hostname: "scontent-a.xx.fbcdn.net", pathname: "/**" },
      { protocol: "https", hostname: "scontent-b.xx.fbcdn.net", pathname: "/**" },
    ],
  },
};

export default nextConfig;
