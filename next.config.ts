import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel compatible — no filesystem, no local SQLite
  // All data persists in Supabase
};

export default nextConfig;
