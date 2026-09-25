import "./globals.css";

export const metadata = {
  title: "DL Media — Téléchargeur de vidéos",
  description:
    "Télécharge des vidéos YouTube, TikTok, Instagram, Twitter et plus. Sans publicité, sans redirection.",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <script
  dangerouslySetInnerHTML={{
    __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js');
        });
      }
    `,
  }}
/>
      <body className="antialiased">{children}</body>
    </html>
  );
}