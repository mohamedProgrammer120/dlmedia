import { NextResponse } from "next/server";

// Liste d'instances Cobalt publiques si la principale est bloquée
const COBALT_INSTANCES = [
  process.env.COBALT_API,
  "https://api.cobalt.tools",
  "https://cobalt-api.kwiatek.xyz",
  "https://co.wuk.sh",
].filter(Boolean);

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
    };

    let cobaltData = null;
    let lastError = null;

    // Boucle sur les instances pour trouver une instance fonctionnelle
    for (const instanceUrl of COBALT_INSTANCES) {
      try {
        const res = await fetch(`${instanceUrl}/`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          body: JSON.stringify(cobaltBody),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status !== "error") {
            cobaltData = data;
            break;
          } else {
            lastError = data.error?.text || "Erreur de l'instance";
          }
        }
      } catch (e) {
        lastError = "Instance injoignable";
      }
    }

    if (!cobaltData) {
      return NextResponse.json(
        { ok: false, error: lastError || "Toutes les instances Cobalt ont échoué." },
        { status: 503 }
      );
    }

    let downloadUrl = null;
    let filename = `media.${format === "mp3" ? "mp3" : "mp4"}`;

    if (cobaltData.status === "tunnel" || cobaltData.status === "redirect") {
      downloadUrl = cobaltData.url;
      filename = cobaltData.filename || filename;
    } else if (cobaltData.status === "picker" && cobaltData.picker?.length > 0) {
      downloadUrl = cobaltData.picker[0].url;
      filename = cobaltData.picker[0].filename || filename;
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { ok: false, error: "Lien de téléchargement non généré." },
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
      { ok: false, error: "Erreur serveur lors du traitement." },
      { status: 500 }
    );
  }
}
