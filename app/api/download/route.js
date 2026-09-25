import { NextResponse } from "next/server";

const COBALT_API = process.env.COBALT_API || "https://api.cobalt.tools";

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, format = "mp4", quality = "1080" } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { ok: false, error: "URL manquante." },
        { status: 400 }
      );
    }

    // Validation basique d'URL
    try {
      new URL(url.trim());
    } catch {
      return NextResponse.json(
        { ok: false, error: "URL invalide." },
        { status: 400 }
      );
    }

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

    // 1. Demande de lien de téléchargement à l'API Cobalt
    const cobaltRes = await fetch(`${COBALT_API}/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(cobaltBody),
    });

    const cobaltData = await cobaltRes.json();

    if (cobaltData.status === "error") {
      return NextResponse.json(
        {
          ok: false,
          error: cobaltData.error?.code?.includes("youtube")
            ? "YouTube bloque actuellement cette instance."
            : cobaltData.error?.text || "Impossible de récupérer le média.",
        },
        { status: 403 }
      );
    }

    // Déterminer l'URL finale
    let targetStreamUrl = null;
    let fallbackFilename = `video.${format === "mp3" ? "mp3" : "mp4"}`;

    if (cobaltData.status === "tunnel" || cobaltData.status === "redirect") {
      targetStreamUrl = cobaltData.url;
      fallbackFilename = cobaltData.filename || fallbackFilename;
    } else if (cobaltData.status === "picker" && cobaltData.picker?.length > 0) {
      targetStreamUrl = cobaltData.picker[0].url;
      fallbackFilename = cobaltData.picker[0].filename || fallbackFilename;
    }

    if (!targetStreamUrl) {
      return NextResponse.json(
        { ok: false, error: "Réponse Cobalt inattendue." },
        { status: 500 }
      );
    }

    // 2. RÉSOLUTION DU PROBLÈME DES 0 OCTETS :
    // On télécharge le flux binaire côté serveur et on le transmet directement au navigateur
    const mediaStream = await fetch(targetStreamUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!mediaStream.ok) {
      throw new Error(`Erreur lors de la récupération du flux : ${mediaStream.statusText}`);
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      mediaStream.headers.get("content-type") || (format === "mp3" ? "audio/mpeg" : "video/mp4")
    );
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fallbackFilename)}"`
    );
    if (mediaStream.headers.get("content-length")) {
      headers.set("Content-Length", mediaStream.headers.get("content-length"));
    }

    // Renvoi du flux de données direct au client
    return new Response(mediaStream.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("[download]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur lors du téléchargement." },
      { status: 500 }
    );
  }
}
