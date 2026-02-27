/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    experimental: {
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
