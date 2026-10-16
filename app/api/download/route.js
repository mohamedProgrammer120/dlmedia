import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.UNIVERSAL_DOWNLOADER_URL || "http://localhost:3000";

// Liste d'instances Cobalt (ordre de priorité)
const COBALT_INSTANCES = [
  process.env.COBALT_API || "https://bergung-api.hoffnungfuerdiezukunft.net",
  "https://cobalt-alpha.wolfy.love",
  "https://nuko-c.meowing.de",
].filter(Boolean);

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

function isFacebook(url) {
  const u = url.toLowerCase();
  return u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.me");
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

  const possibleKeys = ["url", "download", "downloadUrl", "link", "video", "videoUrl", "src", "media", "file"];

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

async function tryCobalt(url, format = "mp4", quality = "1080") {
  const cobaltBody = {
    url: url.trim(),
    filenameStyle: "pretty",
    disableMetadata: false,
  };

  if (format === "mp3") {
    cobaltBody.downloadMode = "audio";
    cobaltBody.audioFormat = "mp3";
    cobaltBody.audioBitrate = "128";
  } else {
    cobaltBody.downloadMode = "auto";
    cobaltBody.videoQuality = quality;
    cobaltBody.youtubeVideoCodec = "h264";
  }

  let lastError = "Aucune instance Cobalt n’a fonctionné";

  for (const instance of COBALT_INSTANCES) {
    try {
      const cobaltRes = await fetch(`${instance}/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(cobaltBody),
        signal: AbortSignal.timeout(15000),
      });

      const cobaltData = await cobaltRes.json();

      if (cobaltData.status === "error") {
        lastError = cobaltData.error?.text || cobaltData.error?.code || "Erreur Cobalt";
        console.warn(`[Cobalt] ${instance} → ${lastError}`);
        continue; // on essaie la suivante
      }

      let downloadUrl = null;
      let filename = `media.${format === "mp3" ? "mp3" : "mp4"}`;

      if (
        cobaltData.status === "tunnel" ||
        cobaltData.status === "redirect" ||
        cobaltData.status === "stream"
      ) {
        downloadUrl = cobaltData.url;
        filename = cobaltData.filename || filename;
      } else if (cobaltData.status === "picker" && cobaltData.picker?.length > 0) {
        const first = cobaltData.picker[0];
        downloadUrl = first.url;
        filename = first.filename || filename;
      }

      if (downloadUrl) {
        console.log(`[Cobalt] Succès avec ${instance}`);
        return { downloadUrl, filename, instance };
      }

      lastError = "Cobalt n’a renvoyé aucun lien";
    } catch (err) {
      lastError = err.message;
      console.warn(`[Cobalt] ${instance} → ${err.message}`);
    }
  }

  throw new Error(lastError);
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

    let downloadUrl = null;
    let filename = `media.${format === "mp3" ? "mp3" : "mp4"}`;
    let usedFallback = false;
    let usedInstance = null;

    // === 1. Essai universalDownloader ===
    try {
      const apiUrl = `${BACKEND_URL}${endpoint}?url=${encodeURIComponent(cleanUrl)}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(12000),
      });

      const data = await response.json();

      if (response.ok && data.success !== false) {
        downloadUrl = findDownloadUrl(data, format !== "mp3");

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
      }
    } catch (err) {
      console.warn("[download] universalDownloader error:", err.message);
    }

    // === 2. Fallback Cobalt UNIQUEMENT pour Facebook ===
    if (!downloadUrl && isFacebook(cleanUrl)) {
      try {
        console.log("[download] Fallback Cobalt pour Facebook...");
        const cobaltResult = await tryCobalt(cleanUrl, format, quality);
        downloadUrl = cobaltResult.downloadUrl;
        filename = cobaltResult.filename;
        usedInstance = cobaltResult.instance;
        usedFallback = true;
      } catch (err) {
        console.error("[download] Cobalt fallback failed:", err.message);
        return NextResponse.json(
          {
            ok: false,
            error: `Impossible de télécharger cette vidéo Facebook. Dernière erreur : ${err.message}`,
          },
          { status: 500 }
        );
      }
    }

    if (!downloadUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "L’API a répondu mais aucun lien de téléchargement n’a pu être extrait.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      downloadUrl,
      filename,
      source: usedFallback ? "cobalt" : "universalDownloader",
      instance: usedInstance || null,
    });
  } catch (err) {
    console.error("[download]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur lors du téléchargement." },
      { status: 500 }
    );
  }
}
