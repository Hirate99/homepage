/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.mskyurina.top',
      },
    ],
  },
};

export default nextConfig;
