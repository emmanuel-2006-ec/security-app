/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    // This tells Next.js not to try and bundle TensorFlow for the server
    config.externals = [...(config.externals || []), '@tensorflow/tfjs', '@tensorflow-models/speech-commands'];
    return config;
  },
};

export default nextConfig;
