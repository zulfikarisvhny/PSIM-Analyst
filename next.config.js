/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfjs-dist ships a worker file (pdf.worker.mjs) that it locates via a
  // relative require at runtime. Next's webpack bundling for server code
  // rewrites/moves that path, so the worker can't be found ("fake worker
  // failed") — excluding the package from bundling lets Node resolve it
  // straight from node_modules instead.
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
  },
};

module.exports = nextConfig;
