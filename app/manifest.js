export default function manifest() {
  return {
    name: "DL Media",
    short_name: "DL Media",
    description: "Téléchargeur de vidéos multi-plateformes. YouTube, TikTok, Instagram, Twitter et plus. Sans publicité.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4F46E5",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };
}