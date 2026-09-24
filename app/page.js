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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      
      {/* ===== HEADER ===== */}
<header className="border-b border-slate-200 bg-white">
  <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
    <div className="flex items-center gap-3">
      {/* Icône */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>
      <div>
        <span className="font-bold text-lg tracking-tight text-slate-900">DL Media</span>
        <p className="text-[11px] text-slate-400 -mt-0.5">by Mohamed & Grok</p>
      </div>
    </div>
    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
      Gratuit & sans pub
    </span>
  </div>
</header>

      {/* ===== HERO ===== */}
      <section className="max-w-3xl mx-auto px-4 pt-14 pb-10 text-center animate-fade-in">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
  Télécharge tes vidéos
  <span className="block text-indigo-600">simplement et rapidement</span>
</h1>
        <p className="mt-5 text-slate-600 text-lg max-w-xl mx-auto leading-relaxed">
          Colle un lien YouTube, TikTok, Instagram, Twitter ou Reddit et télécharge 
          la vidéo ou l’audio en un clic. Aucune publicité, aucune redirection.
        </p>
      </section>

      {/* ===== SEARCH BOX ===== */}
      <section className="max-w-2xl mx-auto px-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 transition">
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            placeholder="Colle un lien YouTube, TikTok, Instagram..."
            className="flex-1 px-4 py-3.5 text-[15px] bg-transparent placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={() => analyze()}
            disabled={analyzing || !url.trim()}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-semibold transition active:scale-95"
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

        {/* Erreur */}
        {error && (
          <div className="mt-4 animate-scale-in bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3.5 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
      </section>

      {/* ===== SKELETON ===== */}
      {analyzing && (
        <div className="max-w-2xl mx-auto px-4 mt-10 animate-scale-in">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="aspect-video bg-slate-100 animate-pulse" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-slate-100 rounded-lg w-3/4 animate-pulse" />
              <div className="h-4 bg-slate-100 rounded-lg w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* ===== RESULT CARD ===== */}
      {info && !analyzing && (
        <div className="max-w-2xl mx-auto px-4 mt-10 animate-scale-in">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
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

            <div className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 leading-snug line-clamp-2">
                {info.title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                {info.author}
                {info.platform && info.platform !== "unknown" && (
                  <span className="ml-2 capitalize text-indigo-600 font-medium">
                    • {info.platform}
                  </span>
                )}
              </p>

              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Qualité vidéo
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {["1080", "720", "480"].map((q) => (
                    <button
                      key={q}
                      onClick={() => download("mp4", q)}
                      disabled={!!downloading}
                      className="py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-sm font-semibold transition active:scale-95 disabled:opacity-50"
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
                  className="w-full py-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-sm font-semibold transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
                    "Télécharger MP3"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FEATURES ===== */}
      {!info && !analyzing && (
        <section className="max-w-5xl mx-auto px-4 mt-20 mb-16 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-center text-2xl font-bold text-slate-900 mb-10">
            Pourquoi nous utiliser ?
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: "Sans publicité",
                desc: "Aucune pub, aucun pop-up, aucune redirection vers des sites douteux.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                ),
              },
              {
                title: "Multi-plateformes",
                desc: "YouTube, TikTok, Instagram, Twitter, Reddit, Facebook, SoundCloud et plus.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                ),
              },
              {
                title: "Téléchargement direct",
                desc: "Le fichier arrive directement dans ton navigateur, sans étape intermédiaire.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                ),
              },
              {
                title: "MP4 & MP3",
                desc: "Choisis la qualité vidéo (1080p, 720p, 480p) ou extrais uniquement l’audio.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                ),
              },
              {
                title: "Rapide & simple",
                desc: "Colle le lien, analyse, télécharge. Trois étapes, zéro complication.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                title: "Respect de la vie privée",
                desc: "Aucune inscription, aucun tracking. On ne stocke rien de tes liens.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-indigo-100 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1.5">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      
      {/* ===== FOOTER ===== */}
<footer className="border-t border-slate-200 bg-white py-8 mt-auto">
  <div className="max-w-5xl mx-auto px-4 text-center text-sm text-slate-500">
    <p className="font-medium text-slate-700">DL Media</p>
    <p className="mt-1">Créé par <span className="text-indigo-600 font-medium">Mohamed</span> & <span className="text-indigo-600 font-medium">Grok</span></p>
    <p className="mt-2 text-xs text-slate-400">Aucune publicité • Aucune redirection • Multi-plateformes</p>
  </div>
</footer>
    </div>
  );
}