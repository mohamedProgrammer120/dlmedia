import { NextResponse } from "next/server";

const YOUTUBE_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export async function POST(request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { ok: false, error: "URL manquante ou invalide." },
        { status: 400 }
      );
    }

    const match = url.trim().match(YOUTUBE_REGEX);
    if (!match) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "URL YouTube non reconnue. Formats acceptés : youtube.com/watch, youtu.be/, youtube.com/shorts/",
        },
        { status: 400 }
      );
    }

    // Méthode légère et fiable pour les métadonnées (pas de téléchargement)
    // oEmbed officiel YouTube
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      url.trim()
    )}&format=json`;

    const oembedRes = await fetch(oembedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    if (!oembedRes.ok) {
      // Vidéo privée / age-restricted / indisponible
      return NextResponse.json(
        {
          ok: false,
          error:
            "Impossible d'accéder à cette vidéo (privée, restreinte par âge ou indisponible).",
        },
        { status: 403 }
      );
    }

    const data = await oembedRes.json();

    // Durée non fournie par oEmbed → on la laisse null
    // Thumbnail HQ : on force maxres si possible
    const videoId = match[5];
    const thumbnail =
      data.thumbnail_url?.replace("hqdefault", "maxresdefault") ||
      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

    return NextResponse.json({
      ok: true,
      title: data.title || "Sans titre",
      author: data.author_name || "Inconnu",
      duration: null,
      thumbnail,
      videoId,
      url: url.trim(),
    });
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de l'analyse de la vidéo." },
      { status: 500 }
    );
  }
}
