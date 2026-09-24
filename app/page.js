"use client";

import { useState, useRef, useCallback } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const inputRef = useRef(null);

  const handlePaste = useCallback((e) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (pasted) {
      setUrl(pasted);
      setTimeout(() => analyze(pasted), 250);
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
    } catch {
      setError("Impossible de contacter le serveur.");
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
        body: JSON.stringify({ url: info.url, format, quality }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Échec du téléchargement");

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
    <div className="min-h-screen bg-[#0b0d13] text-slate-200 flex flex-col items-center px-4 py-14 sm:py-20">
      
      {/* Header */}
      <header className="w-full max-w-xl text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
          Multi-plateformes
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
          Downloader
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
            {" "}propre
          </span>
        </h1>
        <p className="mt-3 text-slate-400 text-sm sm:text-base">
          YouTube, TikTok, Instagram, Twitter… sans pub
        </p>
      </header>

      {/* Input */}
      <div className="w-full max-w-xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-500"></div>
          <div className="relative flex items-center bg-[#12151f] border border-[#1e2433] rounded-2xl overflow-hidden focus-within:border-indigo-500/60 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="Colle un lien ici..."
              className="flex-1 bg-transparent px-5 py-4 text-white placeholder-slate-500 focus:outline-none text-[15px]"
            />
            <button
              onClick={() => analyze()}
              disabled={analyzing || !url.trim()}
              className="m-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-medium transition-all active:scale-95"
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </span>
              ) : (
                "Analyser"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="w-full max-w-xl mt-6 animate-scale-in">
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-5 py-3.5 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Skeleton */}
      {analyzing && (
        <div className="w-full max-w-xl mt-10 animate-scale-in">
          <div className="bg-[#12151f] rounded-2xl border border-[#1e2433] overflow-hidden">
            <div className="aspect-video bg-[#1a1e2b] animate-pulse" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-[#1a1e2b] rounded-lg w-3/4 animate-pulse" />
              <div className="h-4 bg-[#1a1e2b] rounded-lg w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Résultat */}
      {info && !analyzing && (
        <div className="w-full max-w-xl mt-10 animate-scale-in">
          <div className="bg-[#12151f] rounded-2xl border border-[#1e2433] overflow-hidden shadow-2xl shadow-black/40">
            
            {info.thumbnail && (
              <div className="relative aspect-video bg-black overflow-hidden">
                <img
                  src={info.thumbnail}
                  alt={info.title}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  onError={(e) => {
                    if (info.videoId) {
                      e.target.src = `https://i.ytimg.com/vi/${info.videoId}/hqdefault.jpg`;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12151f]/80 to-transparent opacity-60" />
              </div>
            )}

            <div className="p-6">
              <h2 className="text-lg font-semibold text-white leading-snug line-clamp-2">
                {info.title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-400 flex items-center gap-2">
                <span>{info.author}</span>
                {info.platform && info.platform !== "unknown" && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span className="capitalize text-indigo-300/80">{info.platform}</span>
                  </>
                )}
              </p>

              <div className="mt-7 space-y-3">
                <p className="text-[11px] uppercase tracking-widest text-slate-500 font-medium">
                  Qualité vidéo
                </p>
                
                <div className="grid grid-cols-3 gap-2.5">
                  {["1080", "720", "480"].map((q) => (
                    <button
                      key={q}
                      onClick={() => download("mp4", q)}
                      disabled={!!downloading}
                      className="relative py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 text-sm font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="w-full py-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300 text-sm font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {downloading === "mp3-1080" || downloading === "mp3" ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Préparation...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      Télécharger MP3
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-20 text-center text-xs text-slate-600 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        Sans publicité • Sans redirection • Direct
      </footer>
    </div>
  );
}