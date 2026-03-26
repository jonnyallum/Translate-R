/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Vercel deployment
  output: 'standalone',

  // Disable server-side image optimization (not needed for API-only backend)
  images: {
    unoptimized: true,
  },

  // Environment variables available at build time
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
  },

  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['@deepgram/sdk', 'ws', 'stripe'],
  },
};

module.exports = nextConfig;
