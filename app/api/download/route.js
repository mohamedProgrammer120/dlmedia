import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.UNIVERSAL_DOWNLOADER_URL || "http://localhost:3000";

const COBALT_API =
  process.env.COBALT_API || "https://cobalt-production-a71b.up.railway.app";

function getEndpoint(url) {
  const u = url.toLowerCase();

  if (u.includes("youtube.com") || u.includes("youtu.be")) return null; // YouTube → Cobalt
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

function isYoutube(url) {
  const u = url.toLowerCase();
  return u.includes("youtube.com") || u.includes("youtu.be");
}

function findDownloadUrl(data) {
  const items = data?.data?.data || data?.data || data;

  if (Array.isArray(items) && items.length > 0) {
    const sorted = [...items].sort((a, b) => {
      const resA = parseInt(String(a.resolution || "0").replace(/\D/g, "")) || 0;
      const resB = parseInt(String(b.resolution || "0").replace(/\D/g, "")) || 0;
      return resB - resA;
    });

    for (const item of sorted) {
      if (item?.url && typeof item.url === "string") {
        if (item.url.startsWith("http")) return item.url;
        if (item.url.startsWith("/")) return "https://snapsave.app" + item.url;
        if (item.url.startsWith("//")) return "https:" + item.url;
      }
    }
  }

  return findRecursive(data);
}

function findRecursive(obj) {
  if (!obj) return null;
  if (typeof obj === "string") {
    if (obj.startsWith("http")) return obj;
    if (obj.startsWith("//")) return "https:" + obj;
    if (obj.startsWith("/")) return "https://snapsave.app" + obj;
    return null;
  }
  if (typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findRecursive(item);
      if (found) return found;
    }
    return null;
  }

  const keys = ["url", "download", "downloadUrl", "link", "video", "videoUrl", "src"];
  for (const key of keys) {
    if (obj[key]) {
      const found = findRecursive(obj[key]);
      if (found) return found;
    }
  }

  if (obj.data) return findRecursive(obj.data);
  if (obj.media) return findRecursive(obj.media);
  return null;
}

async function tryCobalt(url, format = "mp4", quality = "1080") {
  const body = {
    url: url.trim(),
    filenameStyle: "pretty",
    disableMetadata: false,
  };

  if (format === "mp3") {
    body.downloadMode = "audio";
    body.audioFormat = "mp3";
    body.audioBitrate = "128";
  } else {
    body.downloadMode = "auto";
    body.videoQuality = quality;
    body.youtubeVideoCodec = "h264";
  }

  const res = await fetch(`${COBALT_API}/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000), // 30s car Railway free peut être lent
  });

  const data = await res.json();

  if (data.status === "error") {
    throw new Error(data.error?.text || data.error?.code || "Erreur Cobalt");
  }

  let downloadUrl = null;
  let filename = `youtube.${format === "mp3" ? "mp3" : "mp4"}`;

  if (data.status === "tunnel" || data.status === "redirect" || data.status === "stream") {
    downloadUrl = data.url;
    filename = data.filename || filename;
  } else if (data.status === "picker" && data.picker?.length > 0) {
    downloadUrl = data.picker[0].url;
    filename = data.picker[0].filename || filename;
  }

  if (!downloadUrl) {
    throw new Error("Cobalt n’a renvoyé aucun lien de téléchargement");
  }

  return { downloadUrl, filename };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, format = "mp4", quality = "1080" } = body;

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
    // YOUTUBE → Cobalt Railway
    // ======================
    if (isYoutube(cleanUrl)) {
      try {
        const result = await tryCobalt(cleanUrl, format, quality);
        return NextResponse.json({
          ok: true,
          downloadUrl: result.downloadUrl,
          filename: result.filename,
          source: "cobalt",
        });
      } catch (err) {
        console.error("[download] Cobalt YouTube failed:", err.message);
        return NextResponse.json(
          {
            ok: false,
            error: `Téléchargement YouTube impossible pour le moment : ${err.message}`,
          },
          { status: 503 }
        );
      }
    }

    // ======================
    // AUTRES PLATEFORMES → Deno
    // ======================
    const endpoint = getEndpoint(cleanUrl);

    if (!endpoint) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Plateforme non prise en charge. Supportées : YouTube, TikTok, Instagram, Facebook, Twitter/X…",
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
      signal: AbortSignal.timeout(20000),
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      return NextResponse.json(
        {
          ok: false,
          error: data.message || data.error || data?.data?.msg || "Impossible d’analyser cette vidéo.",
        },
        { status: response.status || 500 }
      );
    }

    const downloadUrl = findDownloadUrl(data);

    if (!downloadUrl) {
      return NextResponse.json(
        { ok: false, error: "Aucun lien de téléchargement n’a pu être extrait." },
        { status: 500 }
      );
    }

    let filename = `media.${format === "mp3" ? "mp3" : "mp4"}`;
    const title =
      data?.data?.title || data?.title || data?.data?.[0]?.title || null;

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
