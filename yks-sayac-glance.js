// ============================================================================
// YKS Sayaç — Hızlı bakış ekranı (glance.html)
// Klasik <script> (IIFE değil). Yalnızca core + study + widget modülleriyle çalışır; Firebase yüklemez,
// bu yüzden açılışı anındadır ve çevrimdışı da çalışır. Veriler bu cihazın yerel depolamasından gelir.
// Ana ekrana ayrı simge olarak eklenebilir (manifest-glance.webmanifest); telefonda gerçek widget değildir.
// ============================================================================

var glanceTimer = null;
var glanceBaseDate = null;
var glanceBaseStreak = 0;
var glanceWakeLock = null;
var glanceInstallEvent = null;
var GLANCE_WAKE_KEY = "glance-wake-lock";

function glanceSetText(id, text) {
  var el = document.getElementById(id);
  if (el && el.textContent !== text) el.textContent = text;
}
function glanceApplyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme === "light" ? "light" : "dark");
}
function glanceRenderClock() {
  var diff = getTarget() - new Date();
  if (diff <= 0) {
    glanceSetText("glanceDays", "0");
    glanceSetText("glanceDaysLabel", "sınav günü geldi");
    glanceSetText("glanceClock", "başarılar! 🍀");
    return;
  }
  var days = Math.floor(diff / 86400000);
  var hours = Math.floor((diff % 86400000) / 3600000);
  var mins = Math.floor((diff % 3600000) / 60000);
  var secs = Math.floor((diff % 60000) / 1000);
  glanceSetText("glanceDays", String(days));
  glanceSetText("glanceDaysLabel", "gün kaldı");
  glanceSetText("glanceClock", pad(hours) + " : " + pad(mins) + " : " + pad(secs));
}
function glanceRenderTarget() {
  var t = getTarget();
  glanceSetText("glanceTarget", t.getDate() + " " + months[t.getMonth()] + " " + t.getFullYear() + " · " + (state.session || "TYT"));
}
function glanceRenderQuote() {
  var idx = Math.floor(Date.now() / (1000 * 60 * 60 * 4)) % quotes.length;
  glanceSetText("glanceQuote", "\u201C" + quotes[idx] + "\u201D");
}
function glanceEnsureBaseStreak() {
  var today = dateStr(new Date());
  if (glanceBaseDate === today) return Promise.resolve(glanceBaseStreak);
  return computeBaseStreak().then(function (base) {
    glanceBaseDate = today;
    glanceBaseStreak = base;
    return base;
  });
}
function glanceRenderStats() {
  return Promise.all([getStudyDaySeconds(studyKey(), true), glanceEnsureBaseStreak()]).then(function (res) {
    var todaySecs = Math.floor(res[0]);
    var qualifies = todaySecs >= STREAK_THRESHOLD_SECONDS;
    var streak = res[1] + (qualifies ? 1 : 0);
    var pct = Math.max(0, Math.min(100, Math.round((todaySecs / STREAK_THRESHOLD_SECONDS) * 100)));
    glanceSetText("glanceStudy", formatHM(todaySecs));
    var fill = document.getElementById("glanceBarFill");
    if (fill) fill.style.width = pct + "%";
    var bar = document.getElementById("glanceBar");
    if (bar) bar.setAttribute("aria-valuenow", String(pct));
    glanceSetText("glanceStudyHint", qualifies
      ? "Bugünkü seri hedefi tamam ✓"
      : "Seri için " + formatHM(Math.max(0, STREAK_THRESHOLD_SECONDS - todaySecs)) + " kaldı");
    glanceSetText("glanceStreak", String(streak));
    glanceSetText("glanceStreakHint", streak > 0 ? (qualifies ? "bugün de sayıldı" : "bugün çalışırsan sürer") : "bugün başla, seri bugün doğsun");
  }).catch(function (err) { console.error("Hızlı bakış verisi okunamadı:", err); });
}
function glanceTick() {
  glanceRenderClock();
  glanceRenderStats();
}
function glanceStart() {
  if (glanceTimer) return;
  glanceTick();
  glanceTimer = setInterval(glanceTick, 1000);
}
function glanceStop() {
  if (glanceTimer) { clearInterval(glanceTimer); glanceTimer = null; }
}
function glanceOnVisibility() {
  if (document.hidden) {
    glanceStop();
  } else {
    glanceRenderTarget();
    glanceStart();
    if (localStorage.getItem(GLANCE_WAKE_KEY) === "1") glanceAcquireWakeLock();   // gizlenince kilit düşer, geri gelince yenilenir
  }
}
// ---- Ekranı açık tut ----
function glanceAcquireWakeLock() {
  if (!("wakeLock" in navigator) || glanceWakeLock) return;
  navigator.wakeLock.request("screen").then(function (lock) {
    glanceWakeLock = lock;
    lock.addEventListener("release", function () { if (glanceWakeLock === lock) glanceWakeLock = null; });
  }).catch(function () {});
}
function glanceReleaseWakeLock() {
  var lock = glanceWakeLock;
  glanceWakeLock = null;
  if (lock) { try { lock.release(); } catch (e) {} }
}
function glanceUpdateWakeBtn() {
  var btn = document.getElementById("glanceWakeBtn");
  if (!btn) return;
  var on = localStorage.getItem(GLANCE_WAKE_KEY) === "1";
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.textContent = on ? "Ekran açık kalıyor ✓" : "Ekranı açık tut";
  btn.classList.toggle("active", on);
}
function glanceToggleWake() {
  var on = localStorage.getItem(GLANCE_WAKE_KEY) === "1";
  if (on) {
    localStorage.setItem(GLANCE_WAKE_KEY, "0");
    glanceReleaseWakeLock();
  } else {
    localStorage.setItem(GLANCE_WAKE_KEY, "1");
    glanceAcquireWakeLock();
  }
  glanceUpdateWakeBtn();
}
// ---- Ana ekrana ekleme ----
function glanceInitInstall() {
  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  if (standalone) return;
  var ua = navigator.userAgent || "";
  var isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIos) {
    var hint = document.getElementById("glanceIosHint");
    if (hint) hint.style.display = "";
  }
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    glanceInstallEvent = e;
    var btn = document.getElementById("glanceInstallBtn");
    if (btn) btn.style.display = "";
  });
  window.addEventListener("appinstalled", function () {
    glanceInstallEvent = null;
    var btn = document.getElementById("glanceInstallBtn");
    if (btn) btn.style.display = "none";
  });
}
function glanceInstall() {
  var ev = glanceInstallEvent;
  if (!ev) return;
  glanceInstallEvent = null;
  ev.prompt();
  ev.userChoice.then(function () {
    var btn = document.getElementById("glanceInstallBtn");
    if (btn) btn.style.display = "none";
  }).catch(function () {});
}
function glanceOpenApp() {
  location.assign("./");
}
function glanceInit() {
  loadSettings().then(function () {
    glanceApplyTheme();
    glanceRenderTarget();
    glanceRenderQuote();
    glanceStart();
  });
  document.getElementById("glanceOpenBtn").addEventListener("click", glanceOpenApp);
  var wakeBtn = document.getElementById("glanceWakeBtn");
  if ("wakeLock" in navigator) {
    wakeBtn.style.display = "";
    wakeBtn.addEventListener("click", glanceToggleWake);
    glanceUpdateWakeBtn();
    if (localStorage.getItem(GLANCE_WAKE_KEY) === "1") glanceAcquireWakeLock();
  }
  document.getElementById("glanceInstallBtn").addEventListener("click", glanceInstall);
  glanceInitInstall();
  document.addEventListener("visibilitychange", glanceOnVisibility);
  // Aynı cihazdaki başka pencerede (kronometre, ayarlar) değişiklik olunca hemen yenile
  window.addEventListener("storage", function (e) {
    if (e.key === "yks-settings") { loadSettings().then(function () { glanceApplyTheme(); glanceRenderTarget(); glanceRenderClock(); }); }
    else glanceRenderStats();
  });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
}
glanceInit();
