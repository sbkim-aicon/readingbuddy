/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    experimental: {
        outputFileTracingIncludes: {
            '/*': ['./data/**/*', './prompts/**/*'],
        },
    },
};

export default nextConfig;
