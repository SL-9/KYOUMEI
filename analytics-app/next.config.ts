import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // analytics-appはVercel上で独立してデプロイされるため、basePath不要
}

export default nextConfig
