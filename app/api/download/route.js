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

function findDownloadUrl(obj, preferVideo = true) {
  if (!obj) return null;

  if (typeof obj === "string") {
    if (obj.startsWith("http")) return obj;
    if (obj.startsWith("/")) return "https://snapsave.app" + obj;
    return null;
  }

  if (typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    // Préférer les URLs complètes et les meilleures résolutions
    const sorted = [...obj].sort((a, b) => {
      const resA = parseInt(a.resolution) || 0;
      const resB = parseInt(b.resolution) || 0;
      return resB - resA; // du plus haut au plus bas
    });

    for (const item of sorted) {
      const found = findDownloadUrl(item, preferVideo);
      if (found) return found;
    }
    return null;
  }

  // Priorité aux clés connues
  const keys = ["url", "download", "downloadUrl", "link", "video", "videoUrl", "src"];
  for (const key of keys) {
    if (obj[key]) {
      const found = findDownloadUrl(obj[key], preferVideo);
      if (found) return found;
    }
  }

  if (obj.data) return findDownloadUrl(obj.data, preferVideo);
  if (obj.media) return findDownloadUrl(obj.media, preferVideo);

  return null;
}

/**
 * Essaie de résoudre les liens Facebook /share/ vers l'URL finale
 */
async function resolveFacebookShareUrl(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    // L'URL finale après redirections
    const finalUrl = response.url;

    if (finalUrl && finalUrl !== url) {
      console.log("[resolve] Facebook share resolved to:", finalUrl);
      return finalUrl;
    }

    return url;
  } catch (err) {
    console.error("[resolve] Failed to resolve share URL:", err.message);
    return url; // on garde l'URL originale en cas d'échec
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, format = "mp4" } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ ok: false, error: "URL manquante." }, { status: 400 });
    }

    let cleanUrl = url.trim();

    try {
      new URL(cleanUrl);
    } catch {
      return NextResponse.json({ ok: false, error: "URL invalide." }, { status: 400 });
    }

    // Si c'est un lien Facebook /share/, on essaie de le résoudre
    const isFacebookShare =
      cleanUrl.includes("facebook.com/share/") ||
      cleanUrl.includes("fb.watch") ||
      cleanUrl.includes("fb.me");

    if (isFacebookShare) {
      cleanUrl = await resolveFacebookShareUrl(cleanUrl);
    }

    const endpoint = getEndpoint(cleanUrl);

    if (!endpoint) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Plateforme non prise en charge. Supportées : YouTube, TikTok, Instagram, Facebook, Twitter/X, Reddit, Pinterest, Threads…",
        },
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

    if (!response.ok || data.success === false || data?.data?.status === false) {
      const errorMsg =
        data?.data?.msg ||
        data?.message ||
        data?.error ||
        "Impossible d’analyser cette vidéo.";

      // Message spécial pour les liens share qui échouent encore
      if (isFacebookShare) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Ce lien Facebook /share/ n’a pas pu être téléchargé. Essayez plutôt un lien de type Reel (facebook.com/reel/...) ou watch (facebook.com/watch/?v=...).",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: false, error: errorMsg }, { status: response.status || 500 });
    }

    const downloadUrl = findDownloadUrl(data, format !== "mp3");

    if (!downloadUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: isFacebookShare
            ? "Lien Facebook /share/ non supporté correctement. Utilisez un lien Reel ou watch direct."
            : "Aucun lien de téléchargement n’a pu être extrait pour cette vidéo.",
        },
        { status: 500 }
      );
    }

    let filename = `media.${format === "mp3" ? "mp3" : "mp4"}`;
    const title =
      data?.data?.title ||
      data?.data?.description ||
      data?.title ||
      data?.data?.[0]?.title ||
      null;

    if (title) {
      const safe = title.replace(/[^\w\s-]/g, "").trim().slice(0, 50);
      if (safe) filename = `${safe}.${format === "mp3" ? "mp3" : "mp4"}`;
    }

    return NextResponse.json({
      ok: true,
      downloadUrl,
      filename,
      source: "universalDownloader",
      resolvedUrl: isFacebookShare ? cleanUrl : undefined,
    });
  } catch (err) {
    console.error("[download]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur lors du téléchargement." },
      { status: 500 }
    );
  }
}
