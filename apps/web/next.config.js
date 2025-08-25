/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    // Enable strict type checking
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    // Run ESLint during builds
    ignoreDuringBuilds: true,
  },
  // Completely disable static generation
  trailingSlash: false,
  generateEtags: false,
  // Disable image optimization
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
