import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ success: false, message: "URL manquante" }, { status: 400 });
    }

    // URL de ton backend déployé sur Railway ou Render (ou localhost en dev)
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
    
    let endpoint = "";

    // Détection de la plateforme pour cibler le bon endpoint d'universalDownloader
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      endpoint = "/api/youtube/download";
    } else if (url.includes("tiktok.com")) {
      endpoint = "/api/tiktok/download";
    } else if (url.includes("instagram.com")) {
      endpoint = "/api/meta/download";
    } else if (url.includes("twitter.com") || url.includes("x.com")) {
      endpoint = "/api/twitter/download";
    } else {
      return NextResponse.json({ success: false, message: "Plateforme non prise en charge." }, { status: 400 });
    }

    // Appel GET vers l'API backend avec l'URL encodée
    const response = await fetch(`${BACKEND_URL}${endpoint}?url=${encodeURIComponent(url)}`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return NextResponse.json({ 
        success: false, 
        message: data.message || "Erreur lors de l'analyse par le backend." 
      }, { status: response.status || 500 });
    }

    // Retourne les données normalisées au front-end
    return NextResponse.json({
      success: true,
      data: data.data
    });

  } catch (error) {
    console.error("Erreur API Analyze:", error);
    return NextResponse.json({ success: false, message: "Erreur interne du serveur." }, { status: 500 });
  }
}
