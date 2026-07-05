/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["mapbox-gl"],
  // Keep Prisma as a single external bundle on Vercel (avoids duplicate client copies).
  serverExternalPackages: ["@prisma/client", "@prisma/extension-accelerate"],
};

export default nextConfig;
