// ============================================================================
// YKS Sayaç — Arayüz: ana döngü (tick), tema, ayar formu, görünüm açma fonksiyonları
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

function tick() {
  var now = new Date();
  var target = getTarget();
  var diff = target - now;

  updateStreakDisplay();

  if (diff <= 0) {
    document.getElementById("daysNumber").textContent = "0";
    document.getElementById("daysLabel").textContent = "sınav günü geldi";
    document.getElementById("clock").textContent = "başarılar! 🍀";
    document.title = "Sınav günü · YKS";
    if (lastDays !== 0) { drawFavicon(0); lastDays = 0; }
    renderQuote();
    return;
  }

  var days = Math.floor(diff / 86400000);
  var hours = Math.floor((diff % 86400000) / 3600000);
  var mins = Math.floor((diff % 3600000) / 60000);
  var secs = Math.floor((diff % 60000) / 1000);

  document.getElementById("daysNumber").textContent = days;
  document.getElementById("daysLabel").textContent = "gün kaldı";
  document.getElementById("clock").textContent = pad(hours) + " : " + pad(mins) + " : " + pad(secs);
  document.title = days + "g " + pad(hours) + ":" + pad(mins) + ":" + pad(secs) + " · YKS";

  if (days !== lastDays) { drawFavicon(days); lastDays = days; }
  renderQuote();
}
function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  var iconHtml = state.theme === "light"
    ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
    : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  var icon1 = document.getElementById("themeIcon");
  if (icon1) icon1.innerHTML = iconHtml;
  document.querySelectorAll(".theme-icon").forEach(function (el) { el.innerHTML = iconHtml; });
}
function fillSettingsForm() {
  document.getElementById("examDate").value = state.examDate;
  document.getElementById("examTime").value = state.examTime;
  document.getElementById("sessionName").value = state.session;
  document.getElementById("dailyGoal").value = state.dailyGoal;
  var obpEl = document.getElementById("obpInput");
  if (obpEl) obpEl.value = state.obp || "";
  renderCoachLinkStatus();
}
function renderCoachLinkStatus() {
  var statusEl = document.getElementById("coachLinkStatus");
  if (!statusEl) return;
  var noteEl = document.getElementById("inviteCodeNote");
  if (noteEl) noteEl.textContent = "";
  var input = document.getElementById("inviteCodeInput");
  if (typeof currentUserProfile !== "undefined" && currentUserProfile && currentUserProfile.coachId) {
    statusEl.textContent = "✓ Bir koça bağlısın. Değiştirmek istersen yeni bir davet kodu girip \"Bağlan\"a basabilirsin.";
    if (input) input.placeholder = "yeni davet kodu (değiştirmek için)";
  } else {
    statusEl.textContent = "Henüz bir koça bağlı değilsin — koçundan davet kodunu isteyip aşağıya girebilirsin.";
    if (input) input.placeholder = "örn. AB12CD";
  }
}
function openExamView() {
  var w = Math.min(Math.round((screen.availWidth || 1600) * 0.7), 900);
  var h = Math.min(Math.round((screen.availHeight || 900) * 0.85), 850);
  window.open(
    location.pathname + "?view=exam",
    "yksSayacExam",
    "width=" + w + ",height=" + h + ",resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no"
  );
}
function openCityView() {
  var w = Math.min(Math.round((screen.availWidth || 1600) * 0.7), 900);
  var h = Math.min(Math.round((screen.availHeight || 900) * 0.85), 850);
  window.open(
    location.pathname + "?view=city",
    "yksSayacCity",
    "width=" + w + ",height=" + h + ",resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no"
  );
}
function openPlanView() {
  var w = Math.min(Math.round((screen.availWidth || 1600) * 0.7), 900);
  var h = Math.min(Math.round((screen.availHeight || 900) * 0.85), 850);
  window.open(
    location.pathname + "?view=plan",
    "yksSayacPlan",
    "width=" + w + ",height=" + h + ",resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no"
  );
}
function roundTotals(totals) {
  var out = {};
  Object.keys(totals || {}).forEach(function (name) {
    out[name] = Math.floor(totals[name]);
  });
  return out;
}

// Yüklü uygulama penceresi dev boyutta açıldıysa (tarayıcı penceresinden kurulunca olur) widget boyutuna küçültür.
// Zaten küçükse ya da kullanıcı özellikle büyütmüşse (700x800'den küçük) dokunmaz. Tarayıcı sekmesinde çalışmaz.
function fitWidgetWindow() {
  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  if (!standalone || typeof window.resizeTo !== "function") return false;
  if (window.innerWidth <= 700 && window.innerHeight <= 800) return false;
  var frameW = Math.max(0, window.outerWidth - window.innerWidth);
  var frameH = Math.max(0, window.outerHeight - window.innerHeight);
  try { window.resizeTo(340 + frameW, 560 + frameH); } catch (e) { return false; }
  return true;
}
