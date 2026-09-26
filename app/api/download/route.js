import { NextResponse } from "next/server";

const COBALT_API = process.env.COBALT_API || "https://cobalt-production-a71b.up.railway.app";

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

    const cobaltBody = {
      url: url.trim(),
      videoQuality: quality,
      downloadMode: "tunnel",
      audioFormat: format === "mp3" ? "mp3" : "best",
      filenameStyle: "pretty",
      youtubeVideoCodec: "h264",
    };

    const cobaltRes = await fetch(`${COBALT_API}/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(cobaltBody),
    });

    const cobaltData = await cobaltRes.json();

    if (cobaltData.status === "error") {
      return NextResponse.json(
        {
          ok: false,
          error: cobaltData.error?.text || "Erreur de téléchargement Cobalt.",
        },
        { status: 403 }
      );
    }

    let targetUrl = null;
    let filename = `media.${format === "mp3" ? "mp3" : "mp4"}`;

    if (cobaltData.status === "tunnel" || cobaltData.status === "redirect" || cobaltData.status === "stream") {
      targetUrl = cobaltData.url;
      filename = cobaltData.filename || filename;
    } else if (cobaltData.status === "picker" && cobaltData.picker?.length > 0) {
      targetUrl = cobaltData.picker[0].url;
      filename = cobaltData.picker[0].filename || filename;
    }

    if (!targetUrl) {
      return NextResponse.json(
        { ok: false, error: "URL de téléchargement introuvable." },
        { status: 500 }
      );
    }

    // Récupérer le flux binaire directement depuis le serveur Cobalt
    const fileRes = await fetch(targetUrl);
    
    if (!fileRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Impossible de récupérer le fichier binaire." },
        { status: 502 }
      );
    }

    // Renvoyer la réponse sous forme de fichier binaire téléchargeable
    return new Response(fileRes.body, {
      headers: {
        "Content-Type": fileRes.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err) {
    console.error("[download]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur lors du traitement." },
      { status: 500 }
    );
  }
}
