import { NextResponse } from "next/server";

const COBALT_API =
  process.env.COBALT_API || "https://cobalt-production-a71b.up.railway.app";

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
      const msg =
        cobaltData.error?.code === "error.api.youtube.login"
          ? "YouTube demande une connexion. Cookies Cobalt expirés."
          : cobaltData.error?.text ||
            cobaltData.error?.code ||
            "Erreur de téléchargement Cobalt.";

      return NextResponse.json({ ok: false, error: msg }, { status: 403 });
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

    if (!downloadUrl) {
      return NextResponse.json(
        { ok: false, error: "Impossible de récupérer le lien de téléchargement." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      downloadUrl,
      filename,
    });
  } catch (err) {
    console.error("[download]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur lors du téléchargement." },
      { status: 500 }
    );
  }
}
