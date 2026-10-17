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

function extractFromMeta(data, originalUrl) {
  const items = data?.data?.data || data?.data || [];

  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  // Miniature (la première disponible)
  const thumbnail = items.find((i) => i.thumbnail)?.thumbnail || null;

  // Liste des qualités disponibles
  const qualities = items
    .filter((i) => i.resolution)
    .map((i) => ({
      resolution: i.resolution,
      hasUrl: !!i.url,
      shouldRender: i.shouldRender || false,
    }));

  // Titre générique (cette API ne renvoie pas de vrai titre)
  let title = "Vidéo Facebook";
  if (originalUrl.includes("instagram.com")) title = "Vidéo Instagram";
  if (originalUrl.includes("reel")) title = "Reel";

  return {
    title,
    author: "Facebook / Instagram",
    thumbnail,
    platform: originalUrl.includes("instagram") ? "instagram" : "facebook",
    qualities,
    rawItems: items, // utile pour le download
  };
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
        { ok: false, error: data.message || data.error || "Impossible d’analyser cette vidéo." },
        { status: response.status || 500 }
      );
    }

    // Cas spécial Facebook / Instagram (structure metadownloader)
    if (endpoint === "/api/meta/download") {
      const meta = extractFromMeta(data, cleanUrl);
      if (meta) {
        return NextResponse.json({
          ok: true,
          title: meta.title,
          author: meta.author,
          thumbnail: meta.thumbnail,
          platform: meta.platform,
          qualities: meta.qualities,
          url: cleanUrl,
        });
      }
    }

    // Fallback générique pour les autres plateformes
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
