import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output configuration
  outputFileTracingRoot: join(__dirname),
  
  // Image optimization for sensor photos
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321',
        pathname: '/storage/v1/object/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Webpack configuration for shared module
  webpack: (config, { isServer }) => {
    // Handle shared module symlink
    config.resolve.symlinks = false;
    
    return config;
  },
  
  // Babel configuration override
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  

  
  // External packages for server components
  serverExternalPackages: ['@supabase/supabase-js'],
};

export default nextConfig;