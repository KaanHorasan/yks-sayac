// ============================================================================
// YKS Sayaç — Ana widget: konu/çalışma kaydı, favicon, alt bilgi, söz, ilerleme ve konu listesi
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

function loadTopics() {
  return storageGet(topicsKey()).then(function (value) {
    if (value) {
      try {
        var parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
}
function saveTopics() {
  return storageSet(topicsKey(), JSON.stringify(todayTopics));
}
function loadStudy() {
  return storageGet(studyKey()).then(function (value) {
    if (value) {
      try {
        var parsed = JSON.parse(value);
        studyState.subjects = parsed.subjects || {};
        studyState.running = !!parsed.running;
        studyState.activeSubject = parsed.activeSubject || null;
        studyState.startTs = parsed.startTs || null;
      } catch (e) {}
    }
  });
}
function saveStudy() {
  return storageSet(studyKey(), JSON.stringify(studyState));
}
function drawFavicon(days) {
  try {
    var canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    var ctx = canvas.getContext("2d");
    var accent = getComputedStyle(document.documentElement).getPropertyValue("--amber").trim() || "#e7a33e";
    var r = 14;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(64, 0, 64, 64, r);
    ctx.arcTo(64, 64, 0, 64, r);
    ctx.arcTo(0, 64, 0, 0, r);
    ctx.arcTo(0, 0, 64, 0, r);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = "#14161b";
    ctx.font = "700 " + (days >= 1000 ? 20 : days >= 100 ? 24 : 30) + "px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(Math.max(days, 0)), 32, 35);
    var link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = canvas.toDataURL("image/png");
  } catch (e) {}
}
function getTarget() {
  return new Date(state.examDate + "T" + state.examTime + ":00+03:00");
}
function renderFooter() {
  var t = getTarget();
  document.getElementById("footerDate").textContent =
    t.getDate() + " " + months[t.getMonth()] + " " + t.getFullYear();
  document.getElementById("footerSession").textContent = state.session || "TYT";
}
function renderQuote() {
  var idx = Math.floor(Date.now() / (1000 * 60 * 60 * 4)) % quotes.length;
  if (idx !== lastQuoteIndex) {
    lastQuoteIndex = idx;
    document.getElementById("quote").textContent = "\u201C" + quotes[idx] + "\u201D";
  }
}
// Koc, kendi ogrencileri icin varsayilan motivasyon cumlelerini
// Koc Paneli'nden degistirebiliyor. Varsa onu kullan, yoksa yukarideki
// varsayilan listede kal.
function loadCoachQuotes() {
  if (!currentUserProfile || !currentUserProfile.coachId) return Promise.resolve();
  return fbDb.collection("users").doc(currentUserProfile.coachId).get().then(function (doc) {
    if (!doc.exists) return;
    var data = doc.data() || {};
    if (Array.isArray(data.motivationQuotes) && data.motivationQuotes.length > 0) {
      quotes = data.motivationQuotes;
      lastQuoteIndex = null;
      renderQuote();
    }
  }).catch(function () {});
}
function renderProgress() {
  var goal = Math.max(state.dailyGoal || 1, 1);
  var pct = Math.min((todayCount / goal) * 100, 100);
  var progressCount = document.getElementById("progressCount");
  var barFill = document.getElementById("barFill");
  if (progressCount) progressCount.textContent = todayCount + "/" + goal;
  if (barFill) barFill.style.width = pct + "%";
  var dashBar = document.getElementById("dashBarFill");
  var dashCount = document.getElementById("dashProgressCount");
  if (dashBar) dashBar.style.width = pct + "%";
  if (dashCount) dashCount.textContent = todayCount + "/" + goal + " tamamlandı";
}
function renderTopics() {
  var list = document.getElementById("topicsList");
  list.innerHTML = "";
  todayTopics.forEach(function (item) {
    var li = document.createElement("li");
    li.className = "topic-item";

    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!item.done;
    cb.setAttribute("aria-label", "Tamamlandı");
    cb.addEventListener("change", function () {
      item.done = cb.checked;
      onTopicsChanged();
      if (item.planTaskId && item.planDay && currentUserUid) {
        var patch = { days: {} };
        patch.days[item.planDay] = {};
        patch.days[item.planDay][item.planTaskId] = { done: cb.checked };
        fbDb.collection("studentData").doc(currentUserUid).collection("info").doc("plan")
          .set(patch, { merge: true }).catch(function () {});
      }
    });

    var span = document.createElement("span");
    span.className = "topic-text" + (item.done ? " done" : "");
    span.textContent = item.text;

    var delBtn = document.createElement("button");
    delBtn.className = "topic-delete";
    delBtn.setAttribute("aria-label", "Sil");
    delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>';
    delBtn.addEventListener("click", function () {
      todayTopics = todayTopics.filter(function (t) { return t.id !== item.id; });
      onTopicsChanged();
    });

    li.appendChild(cb);
    li.appendChild(span);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
  var empty = document.getElementById("topicsEmpty");
  if (empty) empty.style.display = todayTopics.length === 0 ? "block" : "none";
}
function onTopicsChanged() {
  saveTopics();
  renderTopics();
  todayCount = todayTopics.filter(function (t) { return t.done; }).length;
  saveProgress(todayCount);
  renderProgress();
  loadHistory();
}
