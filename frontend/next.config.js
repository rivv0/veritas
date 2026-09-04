/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:4000/api/:path*',
      },
      {
        source: '/ws/:path*',
        destination: 'http://backend:4000/ws/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
