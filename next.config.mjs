/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // next/image не використовується — вимикаємо /_next/image (вразливості оптимізатора в Next 14)
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
}

export default nextConfig