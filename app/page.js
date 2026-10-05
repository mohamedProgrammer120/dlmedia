"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Composant d'arrière-plan animé haute performance (Canvas)
function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particules lumineuses
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Dessin des particules
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129, 140, 248, ${p.alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#6366f1";
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Orbes animées floutées en arrière-plan */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '10s' }} />
    </div>
  );
}

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
      setTimeout(() => analyze(pasted), 200);
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
        setError(data.error || "Erreur d'analyse du lien.");
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background canvas animé */}
      <AnimatedBackground />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                DL Media
              </span>
              <span className="hidden sm:inline-block text-[11px] text-slate-400 ml-2 font-medium">
                by Mohamed & Grok
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a href="#features" className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:block">Fonctionnalités</a>
            <a href="#supported" className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:block">Plateformes</a>
            <a href="#faq" className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:block">FAQ</a>
            <div className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
              v1.0 • Next-Gen
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 z-10 flex flex-col items-center px-4 py-16 max-w-6xl mx-auto w-full">
        {/* Titre & Sous-titre */}
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-indigo-300 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Conversion ultra-rapide & Streaming direct
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Téléchargez vos médias <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              sans aucune limite
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Une plateforme épurée et instantanée pour convertir et télécharger vos vidéos préférées en Haute Définition ou en MP3.
          </p>
        </div>

        {/* Formulaire de téléchargement */}
        <div className="w-full max-w-2xl">
          <div className="p-[1px] rounded-2xl bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 focus-within:from-indigo-500 focus-within:to-pink-500 transition-all duration-500 shadow-2xl shadow-indigo-500/10">
            <div className="bg-slate-900/90 backdrop-blur-2xl rounded-[15px] p-2 sm:p-3 flex items-center gap-3">
              <div className="pl-3 text-slate-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="Collez l'URL de votre vidéo (YouTube, TikTok, Instagram...)"
                className="flex-1 bg-transparent px-2 py-3 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={() => analyze()}
                disabled={analyzing || !url.trim()}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/25 disabled:shadow-none flex items-center justify-center min-w-[120px]"
              >
                {analyzing ? (
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  "Analyser"
                )}
              </button>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 backdrop-blur-md rounded-xl p-4 text-sm text-red-400 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* Skeleton de chargement */}
        {analyzing && (
          <div className="w-full max-w-2xl mt-8">
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl p-6 space-y-4">
              <div className="aspect-video bg-slate-800/60 rounded-xl relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              <div className="space-y-2">
                <div className="h-5 bg-slate-800/80 rounded-lg w-3/4" />
                <div className="h-4 bg-slate-800/60 rounded-lg w-1/2" />
              </div>
            </div>
          </div>
        )}

        {/* Résultat d'Analyse / Carte média */}
        {info && !analyzing && (
          <div className="w-full max-w-2xl mt-8">
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl shadow-indigo-500/10">
              {info.thumbnail && (
                <div className="relative aspect-video bg-slate-950 overflow-hidden group">
                  <img
                    src={info.thumbnail}
                    alt={info.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      if (info.videoId) {
                        e.target.src = `https://i.ytimg.com/vi/${info.videoId}/hqdefault.jpg`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                </div>
              )}

              <div className="p-6">
                <h2 className="text-lg font-bold text-white leading-snug line-clamp-2">
                  {info.title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-400 flex items-center gap-2">
                  <span>{info.author}</span>
                  {info.platform && info.platform !== "unknown" && (
                    <span className="capitalize px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                      • {info.platform}
                    </span>
                  )}
                </p>

                <div className="mt-6 space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Qualité Vidéo (MP4)
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {["1080", "720", "480"].map((q) => (
                      <button
                        key={q}
                        onClick={() => download("mp4", q)}
                        disabled={!!downloading}
                        className="py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {downloading === `mp4-${q}` ? (
                          <svg className="animate-spin h-4 w-4 text-indigo-400" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        ) : (
                          <>
                            <span>{q}p</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-2">
                    Format Audio (MP3)
                  </p>

                  <button
                    onClick={() => download("mp3")}
                    disabled={!!downloading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/30 text-emerald-300 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {downloading === "mp3-1080" || downloading === "mp3" ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-emerald-400" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span>Extraction audio MP3 en cours...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-2v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-2" />
                        </svg>
                        <span>Télécharger en MP3 Haute Qualité</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Plateformes Supportées */}
        <section id="supported" className="w-full mt-24 pt-12 border-t border-white/5">
          <div className="text-center mb-8">
            <h3 className="text-sm font-semibold text-indigo-400 tracking-wider uppercase">Plateformes prises en charge</h3>
            <p className="text-slate-400 text-sm mt-1">Téléchargez depuis vos réseaux sociaux préférés</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: "YouTube", desc: "Vidéos & Shorts (4K/1080p)", icon: "🔴" },
              { name: "TikTok", desc: "Sans filigrane / Watermark", icon: "🎵" },
              { name: "Instagram", desc: "Reels & Posts", icon: "📸" },
              { name: "Twitter / X", desc: "Vidéos HD directes", icon: "🐦" },
            ].map((p, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-md hover:border-white/20 transition-all hover:-translate-y-1">
                <div className="text-3xl mb-3">{p.icon}</div>
                <div className="font-semibold text-slate-200 text-sm">{p.name}</div>
                <div className="text-xs text-slate-500 mt-1">{p.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section Avantages / Features */}
        <section id="features" className="w-full mt-20">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl mb-4">
                ⚡
              </div>
              <h4 className="font-bold text-white text-base">Streaming Direct</h4>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Les fichiers sont transférés directement vers votre appareil sans temps d'attente ni redirection inutile.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xl mb-4">
                🛡️
              </div>
              <h4 className="font-bold text-white text-base">Confidentialité Totale</h4>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Aucune donnée personnelle n'est stockée et aucun compte n'est requis pour profiter du service.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 text-xl mb-4">
                ✨
              </div>
              <h4 className="font-bold text-white text-base">Zéro Publicité</h4>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Une interface épurée, fluide et moderne garantissant une expérience sans fenêtres pop-up gênantes.
              </p>
            </div>
          </div>
        </section>

        {/* Section FAQ */}
        <section id="faq" className="w-full mt-24">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-white">Foire aux questions (FAQ)</h3>
          </div>
          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              {
                q: "Est-ce que le service est 100% gratuit ?",
                a: "Oui, DL Media est un outil entièrement gratuit et libre d'accès sans aucune inscription."
              },
              {
                q: "Comment télécharger uniquement la piste audio MP3 ?",
                a: "Après avoir collé et analysé votre lien, cliquez simplement sur le bouton 'Télécharger en MP3'."
              },
              {
                q: "Sur quels appareils le site fonctionne-t-il ?",
                a: "DL Media est entièrement responsive et fonctionne parfaitement sur smartphones (iOS/Android), tablettes et ordinateurs."
              }
            ].map((faq, i) => (
              <div key={i} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                <h5 className="font-semibold text-slate-200 text-sm">{faq.q}</h5>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-slate-500 border-t border-white/5 bg-slate-950/80 backdrop-blur-md z-10">
        <p>DL Media — Développé par <span className="text-slate-300 font-semibold">Mohamed & Grok</span></p>
        <p className="mt-1 text-slate-600">Projet propulsé sur Vercel avec Next.js & Tailwind CSS</p>
      </footer>
    </div>
  );
}
