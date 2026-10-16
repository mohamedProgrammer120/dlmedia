import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.UNIVERSAL_DOWNLOADER_URL || "http://localhost:3000";

/**
 * Détecte la plateforme et retourne le bon endpoint universalDownloader
 */
function getEndpoint(url) {
  const u = url.toLowerCase();

  if (u.includes("youtube.com") || u.includes("youtu.be")) {
    return "/api/youtube/download";
  }
  if (u.includes("tiktok.com")) {
    return "/api/tiktok/download";
  }
  if (u.includes("instagram.com") || u.includes("facebook.com") || u.includes("fb.watch")) {
    return "/api/meta/download";
  }
  if (u.includes("twitter.com") || u.includes("x.com")) {
    return "/api/twitter/download";
  }
  if (u.includes("reddit.com")) {
    return "/api/reddit/download";
  }
  if (u.includes("pinterest.")) {
    return "/api/pinterest/download";
  }
  if (u.includes("threads.net")) {
    return "/api/threads/download";
  }
  if (u.includes("soundcloud.com")) {
    return "/api/soundcloud/download";
  }
  if (u.includes("spotify.com")) {
    return "/api/spotify/download";
  }
  if (u.includes("tumblr.com")) {
    return "/api/tumblr/download";
  }
  if (u.includes("linkedin.com")) {
    return "/api/linkedin/download";
  }
  if (u.includes("snapchat.com")) {
    return "/api/snapchat/download";
  }

  // Fallback générique (peut échouer selon la plateforme)
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, format = "mp4" } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { ok: false, error: "URL manquante." },
        { status: 400 }
      );
    }

    const cleanUrl = url.trim();

    try {
      new URL(cleanUrl);
    } catch {
      return NextResponse.json(
        { ok: false, error: "URL invalide." },
        { status: 400 }
      );
    }

    const endpoint = getEndpoint(cleanUrl);

    if (!endpoint) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Plateforme non prise en charge pour le moment. Supportées : YouTube, TikTok, Instagram, Twitter/X, Reddit, Pinterest, Threads…",
        },
        { status: 400 }
      );
    }

    // Appel vers ton serveur Deno
    const apiUrl = `${BACKEND_URL}${endpoint}?url=${encodeURIComponent(cleanUrl)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return NextResponse.json(
        {
          ok: false,
          error: data.message || data.error || "Impossible d’analyser cette vidéo.",
        },
        { status: response.status || 500 }
      );
    }

    // Extraction du lien de téléchargement selon la structure de l’API
    // universalDownloader renvoie généralement data.data avec plusieurs formats
    const mediaData = data.data || data;

    let downloadUrl = null;
    let filename = `media.${format === "mp3" ? "mp3" : "mp4"}`;

    // Cas les plus courants selon les plateformes
    if (Array.isArray(mediaData)) {
      // Parfois un tableau de médias
      const video = mediaData.find((m) => m.type === "video" || m.url?.includes(".mp4"));
      const audio = mediaData.find((m) => m.type === "audio" || m.url?.includes(".mp3"));
      downloadUrl = format === "mp3" ? (audio?.url || video?.url) : (video?.url || mediaData[0]?.url);
    } else if (mediaData.videos && mediaData.videos.length > 0) {
      downloadUrl = mediaData.videos[0].url;
    } else if (mediaData.video) {
      downloadUrl = mediaData.video;
    } else if (mediaData.url) {
      downloadUrl = mediaData.url;
    } else if (mediaData.download) {
      downloadUrl = mediaData.download;
    } else if (mediaData.media?.url) {
      downloadUrl = mediaData.media.url;
    }

    // Tentative de récupérer un nom de fichier correct
    if (mediaData.title) {
      const safeTitle = mediaData.title
        .replace(/[^\w\s-]/g, "")
        .trim()
        .slice(0, 60);
      filename = `${safeTitle || "media"}.${format === "mp3" ? "mp3" : "mp4"}`;
    }

    if (!downloadUrl) {
      console.error("Structure reçue de universalDownloader :", JSON.stringify(data, null, 2));
      return NextResponse.json(
        {
          ok: false,
          error:
            "L’API a répondu mais aucun lien de téléchargement n’a pu être extrait. Vérifie la structure de la réponse.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      downloadUrl,
      filename,
      raw: mediaData, // utile pour debug
    });
  } catch (err) {
    console.error("[download]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur lors du téléchargement." },
      { status: 500 }
    );
  }
}
