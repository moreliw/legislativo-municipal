/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Otimizações para build com pouca memória
  experimental: {
    // Reduzir uso de memória no build
    workerThreads: false,
    cpus: 1,
  },
  // Desabilitar source maps em produção para economizar memória
  productionBrowserSourceMaps: false,
  // Otimizar imagens
  images: {
    unoptimized: true,
  },
}
module.exports = nextConfig
