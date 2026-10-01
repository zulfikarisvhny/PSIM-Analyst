/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfjs-dist ships a worker file (pdf.worker.mjs) that it locates via a
  // relative require at runtime. Next's webpack bundling for server code
  // rewrites/moves that path, so the worker can't be found ("fake worker
  // failed") — excluding the package from bundling lets Node resolve it
  // straight from node_modules instead.
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
    // The worker file is only reached via pdfjs-dist's own runtime path
    // resolution, not a static import, so Vercel's build-time file tracer
    // doesn't see it as a dependency and leaves it out of the deployed
    // function — this forces it to be included for every route that parses
    // a PDF server-side.
    outputFileTracingIncludes: {
      "/api/match-reports/preview": ["./node_modules/pdfjs-dist/legacy/build/**"],
      "/api/physical-stats/preview": ["./node_modules/pdfjs-dist/legacy/build/**"],
    },
  },
};

module.exports = nextConfig;
