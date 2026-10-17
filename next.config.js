/** @type {import('next').NextConfig} */
const emulatorFlag = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_TEST ?? '0';
if (!['0', '1'].includes(emulatorFlag)) throw new Error('Invalid emulator build flag.');
if (emulatorFlag === '1' && process.env.VERCEL) throw new Error('Emulator builds are local-test only.');
const nextConfig = {
  // Always define the literal, including when absent: enables dead-code elimination.
  env: { NEXT_PUBLIC_FIREBASE_EMULATOR_TEST: emulatorFlag },
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**'
      }
    ],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
        'net': 'commonjs net',
      });
    }
    return config;
  }
};

module.exports = nextConfig;
