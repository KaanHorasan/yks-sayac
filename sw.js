// YKS Sayaç Service Worker — ağ öncelikli, çevrimdışıyken önbellek.
// Sürüm numarası ve dosya listesi her yayında yayın betiği tarafından doldurulur (aşağıdaki iki satır).
var VERSION = "2.6.0";
var CACHE = "yks-sayac-" + VERSION;
var FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "yks-sayac.css",
  "yks-sayac-errors.js",
  "vendor/firebase-app-compat.js",
  "vendor/firebase-auth-compat.js",
  "vendor/firebase-firestore-compat.js",
  "yks-sayac-cloud.js",
  "yks-sayac-images.js",
  "yks-sayac-core.js",
  "yks-sayac-backup.js",
  "yks-sayac-update.js",
  "yks-sayac-widget.js",
  "yks-sayac-topics.js",
  "yks-sayac-notes.js",
  "yks-sayac-study.js",
  "yks-sayac-city-sprites.js",
  "yks-sayac-city.js",
  "yks-sayac-city-walkers.js",
  "yks-sayac-focus.js",
  "yks-sayac-ui.js",
  "yks-sayac-pip.js",
  "yks-sayac-exam.js",
  "yks-sayac-plan.js",
  "yks-sayac-sync.js",
  "yks-sayac-main.js",
  "glance.html",
  "manifest-glance.webmanifest",
  "yks-sayac-glance.js",
  "icons/glance-192.png",
  "icons/glance-512.png",
  "icons/glance-maskable-512.png",
  "icons/glance-apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FILES.map(function (f) { return new Request(f, { cache: "reload" }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf("yks-sayac-") === 0 && k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function networkFirst(req) {
  return new Promise(function (resolve) {
    var done = false;
    function answer(res) { if (!done && res) { done = true; resolve(res); } return done; }
    var timer = setTimeout(function () {
      caches.match(req, { ignoreSearch: true }).then(function (hit) { answer(hit); });
    }, 4000);
    fetch(req, { cache: "no-cache" }).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { return c.put(req, copy); }).catch(function () {});
      }
      answer(res);
    }).catch(function () {
      clearTimeout(timer);
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (!answer(hit)) { done = true; resolve(Response.error()); }
      });
    });
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Firebase/Google istekleri hiç karışılmaz
  event.respondWith(networkFirst(req));
});
