/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permet de streamer de gros fichiers sans limite trop stricte
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // Important pour le streaming binaire
  async headers() {
    return [
      {
        source: "/api/download",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
