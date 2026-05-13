import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["leaflet", "react-leaflet", "ws", "@neondatabase/serverless", "@prisma/adapter-neon"],
};

export default nextConfig;
