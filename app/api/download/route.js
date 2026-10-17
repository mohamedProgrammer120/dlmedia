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

function findDownloadUrl(data) {
  const items = data?.data?.data || data?.data || data;

  if (!Array.isArray(items) || items.length === 0) {
    return findRecursive(data);
  }

  // Tri par résolution décroissante
  const sorted = [...items].sort((a, b) => {
    const resA = parseInt(String(a.resolution || "0").replace(/\D/g, "")) || 0;
    const resB = parseInt(String(b.resolution || "0").replace(/\D/g, "")) || 0;
    return resB - resA;
  });

  // 1. Priorité aux URLs complètes
  for (const item of sorted) {
    if (item?.url && typeof item.url === "string" && item.url.startsWith("http")) {
      return item.url;
    }
  }

  // 2. URLs relatives
  for (const item of sorted) {
    if (item?.url && typeof item.url === "string") {
      if (item.url.startsWith("/")) return "https://snapsave.app" + item.url;
      if (item.url.startsWith("//")) return "https:" + item.url;
    }
  }

  return null;
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

async function callBackend(url, endpoint) {
  const apiUrl = `${BACKEND_URL}${endpoint}?url=${encodeURIComponent(url)}`;

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(25000), // 25 secondes
  });

  const data = await response.json();
  return { response, data };
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
        { ok: false, error: "Plateforme non prise en charge." },
        { status: 400 }
      );
    }

    let result;
    let lastError = null;

    // On essaie jusqu'à 2 fois (utile quand Deno ou snapsave est lent)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        result = await callBackend(cleanUrl, endpoint);

        if (result.response.ok && result.data.success !== false) {
          break; // succès
        }

        lastError =
          result.data?.message ||
          result.data?.error ||
          result.data?.data?.msg ||
          "Réponse invalide de l'API";
      } catch (err) {
        lastError = err.message || "Timeout ou erreur réseau";
        console.warn(`[download] Tentative ${attempt} échouée:`, lastError);
        if (attempt === 2) throw err;
      }
    }

    const { response, data } = result;

    if (!response.ok || data.success === false) {
      return NextResponse.json(
        { ok: false, error: lastError || "Impossible d’analyser cette vidéo." },
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

    let filename = `facebook-video.${format === "mp3" ? "mp3" : "mp4"}`;
    const firstItem = data?.data?.data?.[0];
    if (firstItem?.resolution) {
      const safeRes = String(firstItem.resolution).replace(/[^\w]/g, "");
      filename = `facebook-${safeRes}.${format === "mp3" ? "mp3" : "mp4"}`;
    }

    return NextResponse.json({
      ok: true,
      downloadUrl,
      filename,
      source: "universalDownloader",
    });
  } catch (err) {
    console.error("[download] Erreur finale:", err);
    return NextResponse.json(
      {
        ok: false,
        error: `Erreur serveur : ${err.message || "Timeout ou problème de connexion"}`,
      },
      { status: 500 }
    );
  }
}
