import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.UNIVERSAL_DOWNLOADER_URL || "http://localhost:3000";

function getEndpoint(url) {
  const u = url.toLowerCase();

  if (u.includes("youtube.com") || u.includes("youtu.be")) return "/api/youtube/download";
  if (u.includes("tiktok.com")) return "/api/tiktok/download";
  if (
    u.includes("instagram.com") ||
    u.includes("facebook.com") ||
    u.includes("fb.watch") ||
    u.includes("fb.me")
  ) {
    return "/api/meta/download";
  }
  if (u.includes("twitter.com") || u.includes("x.com")) return "/api/twitter/download";
  if (u.includes("reddit.com")) return "/api/reddit/download";
  if (u.includes("pinterest.")) return "/api/pinterest/download";
  if (u.includes("threads.net")) return "/api/threads/download";
  if (u.includes("soundcloud.com")) return "/api/soundcloud/download";
  if (u.includes("spotify.com")) return "/api/spotify/download";
  if (u.includes("tumblr.com")) return "/api/tumblr/download";
  if (u.includes("linkedin.com")) return "/api/linkedin/download";
  if (u.includes("snapchat.com")) return "/api/snapchat/download";

  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ ok: false, error: "URL manquante." }, { status: 400 });
    }

    const cleanUrl = url.trim();

    try {
      new URL(cleanUrl);
    } catch {
      return NextResponse.json({ ok: false, error: "URL invalide." }, { status: 400 });
    }

    // ======================
    // CAS SPÉCIAL YOUTUBE (oEmbed = très fiable)
    // ======================
    const isYoutube = /youtube\.com|youtu\.be/i.test(cleanUrl);

    if (isYoutube) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
          cleanUrl
        )}&format=json`;

        const oembedRes = await fetch(oembedUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (oembedRes.ok) {
          const data = await oembedRes.json();

          // Récupérer l'ID de la vidéo pour la miniature HD
          const videoIdMatch = cleanUrl.match(
            /(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/
          );
          const videoId = videoIdMatch?.[1];

          return NextResponse.json({
            ok: true,
            title: data.title || "Vidéo YouTube",
            author: data.author_name || "YouTube",
            thumbnail:
              data.thumbnail_url?.replace("hqdefault", "maxresdefault") ||
              (videoId
                ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
                : null),
            platform: "youtube",
            url: cleanUrl,
            videoId,
          });
        }
      } catch (err) {
        console.warn("[analyze] YouTube oEmbed failed:", err.message);
      }
    }

    // ======================
    // AUTRES PLATEFORMES → universalDownloader
    // ======================
    const endpoint = getEndpoint(cleanUrl);

    if (!endpoint) {
      return NextResponse.json(
        { ok: false, error: "Plateforme non prise en charge." },
        { status: 400 }
      );
    }

    const apiUrl = `${BACKEND_URL}${endpoint}?url=${encodeURIComponent(cleanUrl)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      return NextResponse.json(
        {
          ok: false,
          error: data.message || data.error || "Impossible d’analyser cette vidéo.",
        },
        { status: response.status || 500 }
      );
    }

    // Extraction pour Facebook/Instagram
    if (endpoint === "/api/meta/download") {
      const items = data?.data?.data || [];
      const thumbnail = items.find((i) => i.thumbnail)?.thumbnail || null;

      return NextResponse.json({
        ok: true,
        title: cleanUrl.includes("instagram") ? "Vidéo Instagram" : "Vidéo Facebook",
        author: "Facebook / Instagram",
        thumbnail,
        platform: cleanUrl.includes("instagram") ? "instagram" : "facebook",
        url: cleanUrl,
        qualities: items.map((i) => i.resolution).filter(Boolean),
      });
    }

    // Fallback générique
    const media = data.data || data;
    return NextResponse.json({
      ok: true,
      title: media.title || media.name || "Média détecté",
      author: media.author || media.username || "Inconnu",
      thumbnail: media.thumbnail || media.thumb || media.cover || null,
      platform: media.platform || "unknown",
      url: cleanUrl,
    });
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de l'analyse." },
      { status: 500 }
    );
  }
}
