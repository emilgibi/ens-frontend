import type { NextConfig } from 'next';

const basePath = '/ens/frontend/v1';

const nextConfig: NextConfig = {
  basePath,
  trailingSlash: false,
  eslint: { ignoreDuringBuilds: true }, // linting step (ESLint)
  typescript: { ignoreBuildErrors: true }, // type-checking step (TypeScript)
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  publicRuntimeConfig: {
    basePath,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/entity-universe',
        permanent: true,
      },
      {
        source: '/periodic-monitoring',
        destination: '/periodic-monitoring/view-groups',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
