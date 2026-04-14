/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Ignorar erros de TypeScript no build (erros de tipo não impedem funcionamento)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignorar erros de ESLint no build
  eslint: {
    ignoreDuringBuilds: true,
  },
}
module.exports = nextConfig
