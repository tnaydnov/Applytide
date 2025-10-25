/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  
  // Security: Remove X-Powered-By header
  poweredByHeader: false,
  
  compiler: {
    // Remove console.log in production, but keep console.error and console.warn
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  }
};
module.exports = nextConfig;
