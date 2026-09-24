"use client";

import { useState, useRef, useCallback } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const inputRef = useRef(null);

  // Détection automatique du collage
  const handlePaste = useCallback((e) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (pasted) {
      setUrl(pasted);
      setTimeout(() => analyze(pasted), 300);
    }
  }, []);

  const analyze = async (targetUrl = url) => {
    if (!targetUrl.trim()) return;

    setAnalyzing(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl.trim() }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Erreur d'analyse");
        return;
      }

      setInfo(data);
    } catch (err) {
      setError("Impossible de contacter le serveur d'analyse.");
    } finally {
      setAnalyzing(false);
    }
  };

  const download = async (format, quality = "1080") => {
    if (!info?.url) return;

    setDownloading(`${format}-${quality}`);
    setError(null);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: info.url,
          format,
          quality,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Échec du téléchargement");
      }

      // Téléchargement direct depuis le tunnel Cobalt
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      a.download = data.filename || `video.${format === "mp3" ? "mp3" : "mp4"}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message || "Erreur lors du téléchargement");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-gray-100 flex flex-col items-center px-4 py-12">
      {/* Header */}
      <header className="w-full max-w-2xl text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Downloader <span className="text-indigo-400">propre</span>
        </h1>
        <p className="mt-2 text-gray-400 text-sm">
          YouTube • TikTok • Instagram • Twitter • Reddit • et plus
        </p>
      </header>

      {/* Champ de recherche */}
      <div className="w-full max-w-2xl">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            placeholder="Colle un lien YouTube, TikTok, Instagram, Twitter..."
            className="w-full bg-[#161926] border border-gray-700/60 rounded-2xl px-5 py-4 pr-28 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
          />
          <button
            onClick={() => analyze()}
            disabled={analyzing || !url.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition"
          >
            {analyzing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Analyse...
              </span>
            ) : (
              "Analyser"
            )}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="w-full max-w-2xl mt-6 bg-red-900/30 border border-red-700/50 text-red-200 rounded-xl px-5 py-4 text-sm">
          {error}
        </div>
      )}

      {/* Skeleton pendant l'analyse */}
      {analyzing && (
        <div className="w-full max-w-2xl mt-8 animate-pulse">
          <div className="bg-[#161926] rounded-2xl overflow-hidden border border-gray-800">
            <div className="aspect-video bg-gray-800" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        </div>
      )}

      {/* Carte de résultat */}
      {info && !analyzing && (
        <div className="w-full max-w-2xl mt-8">
          <div className="bg-[#161926] rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
            {/* Thumbnail */}
            {info.thumbnail && (
              <div className="relative aspect-video bg-black">
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

            {/* Infos */}
            <div className="p-5 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white leading-snug line-clamp-2">
                {info.title}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {info.author}
                {info.platform && info.platform !== "unknown"
                  ? ` • ${info.platform}`
                  : ""}
              </p>

              {/* Boutons d'action */}
              <div className="mt-6 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                  Télécharger
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {["1080", "720", "480"].map((q) => (
                    <button
                      key={q}
                      onClick={() => download("mp4", q)}
                      disabled={!!downloading}
                      className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 text-sm font-medium py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {downloading === `mp4-${q}` ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
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
                  className="w-full mt-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-sm font-medium py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {downloading === "mp3-1080" || downloading === "mp3" ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Préparation MP3...
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

      {/* Footer */}
      <footer className="mt-16 text-center text-xs text-gray-600">
        Aucune publicité • Aucune redirection • Multi-plateformes
      </footer>
    </div>
  );
}