/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The web app only ever talks to the API over NEXT_PUBLIC_API_URL.
  // FIBER_RPC_URL and secrets are never referenced here.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
    NEXT_PUBLIC_DEMO_API_KEY: process.env.NEXT_PUBLIC_DEMO_API_KEY || "fpk_test_demo",
  },
};

module.exports = nextConfig;
