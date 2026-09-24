import { NextResponse } from "next/server";

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

    const cleanUrl = url.trim();

    // Validation basique d'URL
    try {
      new URL(cleanUrl);
    } catch {
      return NextResponse.json(
        { ok: false, error: "URL invalide." },
        { status: 400 }
      );
    }

    // Détection YouTube pour oEmbed (meilleure qualité de metadata)
    const isYoutube =
      /youtube\.com|youtu\.be/i.test(cleanUrl);

    if (isYoutube) {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        cleanUrl
      )}&format=json`;

      const oembedRes = await fetch(oembedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (oembedRes.ok) {
        const data = await oembedRes.json();
        const videoIdMatch = cleanUrl.match(
          /(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/
        );
        const videoId = videoIdMatch?.[1];

        return NextResponse.json({
          ok: true,
          title: data.title || "Sans titre",
          author: data.author_name || "Inconnu",
          thumbnail:
            data.thumbnail_url?.replace("hqdefault", "maxresdefault") ||
            (videoId
              ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
              : null),
          videoId,
          url: cleanUrl,
          platform: "youtube",
        });
      }
    }

    // Pour les autres plateformes → réponse générique
    // Cobalt s'occupera du téléchargement
    let platform = "unknown";
    if (/tiktok\.com/i.test(cleanUrl)) platform = "tiktok";
    else if (/instagram\.com/i.test(cleanUrl)) platform = "instagram";
    else if (/twitter\.com|x\.com/i.test(cleanUrl)) platform = "twitter";
    else if (/reddit\.com/i.test(cleanUrl)) platform = "reddit";
    else if (/facebook\.com|fb\.watch/i.test(cleanUrl)) platform = "facebook";
    else if (/soundcloud\.com/i.test(cleanUrl)) platform = "soundcloud";
    else if (/vimeo\.com/i.test(cleanUrl)) platform = "vimeo";
    else if (/pinterest\./i.test(cleanUrl)) platform = "pinterest";
    else if (/twitch\.tv/i.test(cleanUrl)) platform = "twitch";

    return NextResponse.json({
      ok: true,
      title: "Média détecté",
      author: platform.charAt(0).toUpperCase() + platform.slice(1),
      thumbnail: null,
      url: cleanUrl,
      platform,
    });
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de l'analyse." },
      { status: 500 }
    );
  }
}