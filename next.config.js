/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'javascript-obfuscator',
      '@prisma/client'
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('javascript-obfuscator')
    }
    return config
  }
}

module.exports = nextConfig