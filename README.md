# YouTube Downloader Propre

Application Next.js 14 (App Router) + Tailwind CSS.  
Sans publicité, sans redirection externe, téléchargement direct dans le navigateur.

## Structure du projet

```
youtube-downloader/
├── app/
│   ├── api/
│   │   ├── analyze/route.js   # Analyse URL → titre, auteur, thumbnail
│   │   └── download/route.js  # Stream binaire MP4 / MP3 (tunnel Cobalt)
│   ├── globals.css
│   ├── layout.js
│   └── page.js                # Interface client complète
├── public/
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── README.md
```

## Installation

```bash
cd youtube-downloader
npm install
```

## Configuration

Copie `.env.example` vers `.env.local` et définis ton instance Cobalt :

```env
COBALT_API=https://ton-instance-cobalt.com
```

> **Important** : l’API publique `api.cobalt.tools` n’est pas destinée à un usage tiers et YouTube y est souvent bloqué.  
> Self-host Cobalt (Docker) ou utilise une instance communautaire qui fonctionne encore.

## Lancement

```bash
npm run dev
```

Ouvre http://localhost:3000

## Déploiement

- **Vercel** : fonctionne pour l’UI + analyse. Le téléchargement de longues vidéos peut timeout (limites serverless).
- **Recommandé** : VPS (Hetzner, Railway, Fly.io…) avec une instance Cobalt self-hosted à côté.

## Fonctionnalités

- Détection automatique du collage (paste)
- Dark mode (#0d0f17 / #161926)
- Résolutions 1080p / 720p / 480p + MP3
- Streaming binaire direct (`Content-Disposition: attachment`)
- Aucune redirection vers des sites tiers
- Nettoyage des ObjectURL (pas de fuite mémoire)
