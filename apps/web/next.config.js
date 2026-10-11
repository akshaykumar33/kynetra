/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kynetra/contracts'],
  webpack: (config) => {
    // Workspace packages are TypeScript written for NodeNext resolution, so
    // their relative imports end in `.js` while the source files are `.ts`.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
