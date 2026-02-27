/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals = [...(Array.isArray(config.externals) ? config.externals : []), 'pdf-parse'];
        }
        return config;
    },
    experimental: {
        serverComponentsExternalPackages: ['pdf-parse'],
        outputFileTracingIncludes: {
            '/': ['./data/**/*'],
            '/admin': ['./data/**/*'],
            '/speaker/[cardId]': ['./data/**/*', './prompts/**/*'],
            '/api/chat': ['./data/**/*', './prompts/**/*'],
            '/api/admin/cards': ['./data/**/*'],
            '/api/book-data-analyzer': ['./prompts/**/*'],
            '/api/realtime': [],
        },
    },
};

export default nextConfig;
