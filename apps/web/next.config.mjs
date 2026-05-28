/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@transcribe-ai/shared'],
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
