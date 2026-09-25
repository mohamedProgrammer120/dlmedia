// public/sw.js
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Installe immédiatement
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim()); // Prend le contrôle des pages
});