/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mbspro/shared'],
  typescript: {
    // Enable strict type checking
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    // Run ESLint during builds
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
