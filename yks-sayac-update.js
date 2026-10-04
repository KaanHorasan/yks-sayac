// ============================================================================
// YKS Sayaç — Sürüm bilgisi ve güncelleme (PWA / Service Worker)
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
//
// Uygulama artık barındırılan bir web uygulaması: güncellemeler sunucuya yüklendiği anda herkese gider.
// Service Worker (sw.js) yeni sürümü arka planda indirir; hazır olunca "Şimdi Yenile" gösterilir.
// Firestore'daki appConfig/latestVersion belgesi yalnızca duyuru kanalı olarak kalır (indirme yok).
// ============================================================================
var swHadController = false;
var swUpdateReady = false;
function compareVersions(a, b) {
  var pa = String(a || "0").split(".").map(function (n) { return parseInt(n, 10) || 0; });
  var pb = String(b || "0").split(".").map(function (n) { return parseInt(n, 10) || 0; });
  var len = Math.max(pa.length, pb.length);
  for (var i = 0; i < len; i++) {
    var da = pa[i] || 0, db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}
function showUpdateToast(message) {
  var el = document.getElementById("updateToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "updateToast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(showUpdateToast._t);
  showUpdateToast._t = setTimeout(function () { el.classList.remove("show"); }, 8000);
}
function showUpdateToastOnce(remoteVersion, message) {
  storageGet("update-toast-shown-version").then(function (shownVersion) {
    if (shownVersion === remoteVersion) return;
    showUpdateToast(message);
    storageSet("update-toast-shown-version", remoteVersion);
  }).catch(function () {});
}
function setUpdateBadge(on) {
  var settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    if (on) settingsBtn.classList.add("has-update-badge");
    else settingsBtn.classList.remove("has-update-badge");
  }
}
// Sürüm satırı hem widget ayarlarında hem koç/yönetici panelinde var: hepsi .js-version-note ile güncellenir.
function setAppVersionNotes(text, attention) {
  Array.prototype.forEach.call(document.querySelectorAll(".js-version-note"), function (el) {
    el.textContent = text;
    el.classList.toggle("settings-note-attention", !!attention);
  });
}
function showReloadButtons(show) {
  Array.prototype.forEach.call(document.querySelectorAll(".js-reload-btn"), function (b) {
    b.style.display = show ? "" : "none";
    b.disabled = false;
  });
}
function onNewVersionReady() {
  swUpdateReady = true;
  setAppVersionNotes("Sürüm " + APP_VERSION + " · yeni sürüm hazır, yenileyince devreye girer.", true);
  showReloadButtons(true);
  setUpdateBadge(true);
  showUpdateToast("Yeni sürüm yüklendi. Ayarlar'dan veya panelden 'Şimdi Yenile' ile geçebilirsin.");
}
function checkForUpdateManually() {
  if (swUpdateReady) { location.reload(); return Promise.resolve(); }
  setAppVersionNotes("Sürüm " + APP_VERSION + " · güncelleme aranıyor…", false);
  if (!("serviceWorker" in navigator)) {
    setAppVersionNotes("Sürüm " + APP_VERSION + " · bu tarayıcıda otomatik güncelleme yok, sayfayı yenile.", false);
    return Promise.resolve();
  }
  return navigator.serviceWorker.getRegistration().then(function (reg) {
    if (!reg) {
      setAppVersionNotes("Sürüm " + APP_VERSION + " · güncelleme servisi kayıtlı değil, sayfayı yenile.", false);
      return null;
    }
    return reg.update().then(function () {
      return new Promise(function (resolve) {
        setTimeout(function () {
          if (!swUpdateReady) setAppVersionNotes("Sürüm " + APP_VERSION + " · uygulama güncel.", false);
          resolve();
        }, 4000);
      });
    });
  }).catch(function () {
    setAppVersionNotes("Sürüm " + APP_VERSION + " · güncelleme kontrol edilemedi (internet bağlantını kontrol et).", false);
  });
}
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  var secure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!secure) return;
  swHadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!swHadController) { swHadController = true; return; } // ilk kurulumda bildirim gösterme
    onNewVersionReady();
  });
  navigator.serviceWorker.register("sw.js").then(function (reg) {
    reg.update().catch(function () {});
    setInterval(function () { reg.update().catch(function () {}); }, 3600000);
  }).catch(function (err) {
    console.error("Service Worker kaydedilemedi:", err);
  });
}
function checkForUpdate() {
  if (!swUpdateReady) setAppVersionNotes("Sürüm " + APP_VERSION, false);
  try {
    fbDb.collection("appConfig").doc("latestVersion").get().then(function (doc) {
      if (!doc.exists) return;
      var data = doc.data() || {};
      if (data.version && compareVersions(data.version, APP_VERSION) > 0 && !data.downloadUrl) {
        setAppVersionNotes("Sürüm " + APP_VERSION + " · yeni sürüm var: v" + data.version + (data.message ? " — " + data.message : "") + ".", true);
        setUpdateBadge(true);
        showUpdateToastOnce(data.version, "Yeni bir sürüm var (v" + data.version + "). Ayarlar'dan detay gör.");
      }
    }).catch(function () {
      // Çevrimdışıysa sessizce geç - widget'ın açılmasını asla engellememeli.
    });
  } catch (e) {}
}
