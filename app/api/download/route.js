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

  if (typeof obj === "string" && (obj.startsWith("http") || obj.startsWith("//"))) {
    return obj.startsWith("//") ? "https:" + obj : obj;
  }

  if (typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    const videos = obj.filter(
      (item) =>
        item?.type === "video" ||
        item?.url?.includes(".mp4") ||
        item?.url?.includes("video") ||
        item?.quality ||
        item?.resolution
    );
    const images = obj.filter(
      (item) =>
        item?.type === "image" ||
        item?.url?.includes(".jpg") ||
        item?.url?.includes(".webp")
    );

    const preferred = preferVideo
      ? videos.length > 0 ? videos : images
      : images.length > 0 ? images : videos;

    for (const item of preferred) {
      const found = findDownloadUrl(item, preferVideo);
      if (found) return found;
    }

    for (const item of obj) {
      const found = findDownloadUrl(item, preferVideo);
      if (found) return found;
    }
    return null;
  }

  const possibleKeys = [
    "url", "download", "downloadUrl", "link", "video", "videoUrl", "src", "media", "file",
  ];

  for (const key of possibleKeys) {
    if (obj[key]) {
      const found = findDownloadUrl(obj[key], preferVideo);
      if (found) return found;
    }
  }

  if (obj.media) return findDownloadUrl(obj.media, preferVideo);
  if (obj.videos) return findDownloadUrl(obj.videos, preferVideo);
  if (obj.data) return findDownloadUrl(obj.data, preferVideo);
  if (obj.files) return findDownloadUrl(obj.files, preferVideo);

  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, format = "mp4" } = body;

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

    if (!response.ok || data.success === false) {
      return NextResponse.json(
        {
          ok: false,
          error: data.message || data.error || "Impossible d’analyser cette vidéo.",
        },
        { status: response.status || 500 }
      );
    }

    const downloadUrl = findDownloadUrl(data, format !== "mp3");

    if (!downloadUrl) {
      // Message plus clair pour les liens Facebook share
      const isShareLink = cleanUrl.includes("/share/");
      return NextResponse.json(
        {
          ok: false,
          error: isShareLink
            ? "Les liens Facebook de type /share/ sont souvent bloqués. Essaie plutôt un lien de Reel ou de vidéo directe (facebook.com/reel/... ou facebook.com/watch/?v=...)."
            : "L’API a répondu mais aucun lien de téléchargement n’a pu être extrait.",
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
    });
  } catch (err) {
    console.error("[download]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur lors du téléchargement." },
      { status: 500 }
    );
  }
}
