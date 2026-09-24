import "./globals.css";

export const metadata = {
  title: "Downloader propre — YouTube MP4 / MP3",
  description:
    "Téléchargeur YouTube sans publicité, sans redirection, téléchargement direct dans le navigateur.",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
