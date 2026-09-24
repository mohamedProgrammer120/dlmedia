#!/bin/bash
set -e

echo "📦 Installation des dépendances..."
npm install

echo ""
echo "⚙️  Configuration de l'environnement..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "→ Fichier .env.local créé. Ouvre-le et mets ton URL Cobalt :"
  echo "   COBALT_API=https://ton-instance-cobalt.com"
else
  echo "→ .env.local existe déjà."
fi

echo ""
echo "🚀 Lancement du serveur de développement..."
echo "   Ouvre http://localhost:3000"
echo ""
npm run dev
