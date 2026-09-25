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

    const cobaltBody = {
      url: url.trim(),
      videoQuality: quality,
      downloadMode: format === "mp3" ? "audio" : "auto",
      audioFormat: format === "mp3" ? "mp3" : "best",
      filenameStyle: "pretty",
      youtubeVideoCodec: "h264",
      alwaysProxy: true, // Force Cobalt à servir le fichier de façon compatible
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
          error: cobaltData.error?.code?.includes("youtube")
            ? "YouTube bloque cette instance actuellement."
            : cobaltData.error?.text || "Erreur de téléchargement.",
        },
        { status: 403 }
      );
    }

    let downloadUrl = null;

    if (cobaltData.status === "tunnel" || cobaltData.status === "redirect") {
      downloadUrl = cobaltData.url;
    } else if (cobaltData.status === "picker" && cobaltData.picker?.length > 0) {
      downloadUrl = cobaltData.picker[0].url;
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { ok: false, error: "Lien de téléchargement non disponible." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      downloadUrl,
    });
  } catch (err) {
    console.error("[download]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur lors du traitement." },
      { status: 500 }
    );
  }
}
