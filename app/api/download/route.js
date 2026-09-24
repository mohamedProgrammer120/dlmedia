import { NextResponse } from "next/server";

const COBALT_API = process.env.COBALT_API || "https://api.cobalt.tools";
const YOUTUBE_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, format = "mp4", quality = "1080" } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ ok: false, error: "URL manquante." }, { status: 400 });
    }

    if (!YOUTUBE_REGEX.test(url.trim())) {
      return NextResponse.json({ ok: false, error: "URL YouTube invalide." }, { status: 400 });
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
          error:
            cobaltData.error?.code?.includes("youtube")
              ? "YouTube bloque actuellement cette instance."
              : cobaltData.error?.text || "Impossible de récupérer le média.",
        },
        { status: 403 }
      );
    }

    // Cas tunnel ou redirect → on renvoie l'URL au frontend
    if (cobaltData.status === "tunnel" || cobaltData.status === "redirect") {
      return NextResponse.json({
        ok: true,
        downloadUrl: cobaltData.url,
        filename: cobaltData.filename || `video.${format === "mp3" ? "mp3" : "mp4"}`,
      });
    }

    // Cas picker
    if (cobaltData.status === "picker" && cobaltData.picker?.length > 0) {
      const first = cobaltData.picker[0];
      return NextResponse.json({
        ok: true,
        downloadUrl: first.url,
        filename: first.filename || `video.${format}`,
      });
    }

    return NextResponse.json({ ok: false, error: "Réponse Cobalt inattendue." }, { status: 500 });
  } catch (err) {
    console.error("[download]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur lors du téléchargement." },
      { status: 500 }
    );
  }
}
