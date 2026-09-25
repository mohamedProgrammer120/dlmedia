"use client";

import { useState, useRef, useCallback } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const inputRef = useRef(null);

  // Fonction utilitaire pour nettoyer l'URL entrée (supprime le texte indésirable au début)
  const cleanInputUrl = (rawUrl) => {
    if (!rawUrl) return "";
    const matched = rawUrl.match(/(https?:\/\/[^\s]+)/);
    return matched ? matched[0] : rawUrl.trim();
  };

  // Gestion du collage automatique dans le champ texte
  const handlePaste = useCallback((e) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (pasted) {
      const cleaned = cleanInputUrl(pasted);
      setUrl(cleaned);
      setTimeout(() => analyze(cleaned), 200);
    }
  }, []);

  // Analyse du lien
  const analyze = async (targetUrl = url) => {
    const cleanedUrl = cleanInputUrl(targetUrl);
    if (!cleanedUrl) return;

    setUrl(cleanedUrl);
    setAnalyzing(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanedUrl }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Erreur d'analyse");
        return;
      }
      setInfo(data);
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Téléchargement du fichier sous forme de Blob (Résout le problème des fichiers à 0 octet)
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
      downloadMode: format === "mp3" ? "audio" : "auto",
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
        { ok: false, error: "URL de téléchargement introuvable." },
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
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* ===== TOP BAR ===== */}
      <header className="sticky top-0 z-50 glass border-b border-white/40 bg-white/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-[15px] tracking-tight">DL Media</span>
              <span className="hidden sm:inline text-xs text-slate-400 ml-2">by Mohamed & Grok</span>
            </div>
          </div>
          <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            v1.0
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-up">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Téléchargeur moderne
          </h1>
          <p className="mt-3 text-slate-500 text-[15px] max-w-md mx-auto">
            YouTube, TikTok, Instagram, Twitter…<br />
            Colle un lien et télécharge en un clic.
          </p>
        </div>

        {/* Search Card */}
        <div className="w-full max-w-xl animate-fade-up" style={{ animationDelay: "0.08s" }}>
          <div className="glass rounded-2xl p-2 shadow-xl shadow-slate-200/60 bg-white border border-slate-100">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="Colle un lien ici..."
                className="flex-1 bg-transparent px-4 py-3.5 text-[15px] placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={() => analyze()}
                disabled={analyzing || !url.trim()}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-200"
              >
                {analyzing ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  "Analyser"
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 animate-scale-in glass rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2.5 border border-red-100 bg-red-50/50">
              <svg className="w-4.5 h-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Skeleton Loading */}
        {analyzing && (
          <div className="w-full max-w-xl mt-8 animate-scale-in">
            <div className="glass rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 bg-white border border-slate-100">
              <div className="aspect-video bg-slate-100/80 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-100 rounded-lg w-3/4 animate-pulse" />
                <div className="h-4 bg-slate-100 rounded-lg w-1/2 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Result Card */}
        {info && !analyzing && (
          <div className="w-full max-w-xl mt-8 animate-scale-in">
            <div className="glass rounded-2xl overflow-hidden shadow-xl shadow-slate-200/60 bg-white border border-slate-100">
              {info.thumbnail && (
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  <img
                    src={info.thumbnail}
                    alt={info.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      if (info.videoId) {
                        e.target.src = `https://i.ytimg.com/vi/${info.videoId}/hqdefault.jpg`;
                      }
                    }}
                  />
                </div>
              )}

              <div className="p-5 sm:p-6">
                <h2 className="text-[17px] font-semibold text-slate-900 leading-snug line-clamp-2">
                  {info.title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  {info.author}
                  {info.platform && info.platform !== "unknown" && (
                    <span className="ml-1.5 capitalize text-indigo-600 font-medium">
                      • {info.platform}
                    </span>
                  )}
                </p>

                <div className="mt-6 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Qualité
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2.5">
                    {["1080", "720", "480"].map((q) => (
                      <button
                        key={q}
                        onClick={() => download("mp4", q)}
                        disabled={!!downloading}
                        className="py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                      >
                        {downloading === `mp4-${q}` ? (
                          <svg className="animate-spin h-4 w-4 mx-auto" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        ) : (
                          `${q}p`
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => download("mp3")}
                    disabled={!!downloading}
                    className="w-full py-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {downloading === "mp3-1080" || downloading === "mp3" ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Téléchargement en cours...
                      </>
                    ) : (
                      "Télécharger MP3"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features (only when no result) */}
        {!info && !analyzing && (
          <div className="w-full max-w-3xl mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            {[
              { title: "Sans pub", icon: "🚫" },
              { title: "Multi-plateformes", icon: "🌐" },
              { title: "Direct", icon: "⚡" },
              { title: "Privé", icon: "🔒" },
            ].map((item, i) => (
              <div key={i} className="glass rounded-xl py-4 px-3 text-center bg-white/60 border border-slate-100">
                <div className="text-xl mb-1.5">{item.icon}</div>
                <div className="text-xs font-medium text-slate-600">{item.title}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="py-6 text-center text-xs text-slate-400">
        DL Media — Créé par Mohamed & Grok
      </footer>
    </div>
  );
}
