import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.UNIVERSAL_DOWNLOADER_URL || "http://localhost:3000";

/**
 * Détecte la plateforme et retourne le bon endpoint
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

  return null;
}

/**
 * Extrait titre, auteur, thumbnail et platform depuis la réponse universalDownloader
 */
function extractMetadata(data, originalUrl) {
  const media = data.data || data;

  let title = "Média détecté";
  let author = "Inconnu";
  let thumbnail = null;
  let platform = "unknown";

  // Titre
  if (media.title) title = media.title;
  else if (media.name) title = media.name;
  else if (Array.isArray(media) && media[0]?.title) title = media[0].title;

  // Auteur / username
  if (media.author) author = media.author;
  else if (media.username) author = media.username;
  else if (media.owner) author = media.owner;
  else if (media.uploader) author = media.uploader;

  // Thumbnail
  if (media.thumbnail) thumbnail = media.thumbnail;
  else if (media.thumb) thumbnail = media.thumb;
  else if (media.cover) thumbnail = media.cover;
  else if (media.image) thumbnail = media.image;
  else if (Array.isArray(media.photos) && media.photos[0]?.url) {
    thumbnail = media.photos[0].url;
  }

  // Platform
  if (media.platform) platform = media.platform.toLowerCase();
  else {
    const u = originalUrl.toLowerCase();
    if (u.includes("youtube") || u.includes("youtu.be")) platform = "youtube";
    else if (u.includes("tiktok")) platform = "tiktok";
    else if (u.includes("instagram")) platform = "instagram";
    else if (u.includes("twitter") || u.includes("x.com")) platform = "twitter";
    else if (u.includes("reddit")) platform = "reddit";
    else if (u.includes("pinterest")) platform = "pinterest";
    else if (u.includes("threads")) platform = "threads";
    else if (u.includes("soundcloud")) platform = "soundcloud";
    else if (u.includes("facebook") || u.includes("fb.watch")) platform = "facebook";
  }

  return { title, author, thumbnail, platform };
}

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

    // Validation basique
    try {
      new URL(cleanUrl);
    } catch {
      return NextResponse.json(
        { ok: false, error: "URL invalide." },
        { status: 400 }
      );
    }

    // === 1. Tentative via universalDownloader (Deno) ===
    const endpoint = getEndpoint(cleanUrl);

    if (endpoint) {
      try {
        const apiUrl = `${BACKEND_URL}${endpoint}?url=${encodeURIComponent(cleanUrl)}`;

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          // Timeout de sécurité (Deno peut parfois être lent)
          signal: AbortSignal.timeout(12000),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          const meta = extractMetadata(data, cleanUrl);

          return NextResponse.json({
            ok: true,
            title: meta.title,
            author: meta.author,
            thumbnail: meta.thumbnail,
            url: cleanUrl,
            platform: meta.platform,
            // On garde la data brute si besoin plus tard
            raw: data.data || data,
          });
        }
      } catch (err) {
        // On continue vers les fallbacks si Deno échoue
        console.warn("[analyze] universalDownloader failed:", err.message);
      }
    }

    // === 2. Fallback spécial YouTube (oEmbed = meilleure qualité) ===
    const isYoutube = /youtube\.com|youtu\.be/i.test(cleanUrl);

    if (isYoutube) {
      try {
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
      } catch (err) {
        console.warn("[analyze] YouTube oEmbed failed:", err.message);
      }
    }

    // === 3. Fallback générique (si tout échoue) ===
    let platform = "unknown";
    if (/tiktok\.com/i.test(cleanUrl)) platform = "tiktok";
    else if (/instagram\.com/i.test(cleanUrl)) platform = "instagram";
    else if (/twitter\.com|x\.com/i.test(cleanUrl)) platform = "twitter";
    else if (/reddit\.com/i.test(cleanUrl)) platform = "reddit";
    else if (/facebook\.com|fb\.watch/i.test(cleanUrl)) platform = "facebook";
    else if (/soundcloud\.com/i.test(cleanUrl)) platform = "soundcloud";
    else if (/pinterest\./i.test(cleanUrl)) platform = "pinterest";
    else if (/threads\.net/i.test(cleanUrl)) platform = "threads";

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
