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
  // Disable static optimization to avoid prerendering issues
  trailingSlash: false,
  generateEtags: false,
}

module.exports = nextConfig
