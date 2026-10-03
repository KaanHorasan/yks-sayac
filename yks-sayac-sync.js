// ============================================================================
// YKS Sayaç — Bulut eşitleme: yönetici işlemlerini uygulama ve öğrenci özeti
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

// ---- Yönetici işlemlerini uygula (altın / çalışma süresi / duyuru) ----
// cloud.js, studentData/{uid}/adminGrants içindeki bekleyen işlemleri dinler ve buraya verir.
// Aynı işlemin iki kez uygulanmaması için uygulanan kimlikler yerelde de tutulur.
var ADMIN_APPLIED_KEY = "admin-grants-applied";
var adminGrantChain = Promise.resolve();
var adminSyncTimer = null;
function showAdminMessage(text) {
  var ov = document.getElementById("adminMsgOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "adminMsgOverlay";
    ov.className = "admin-msg-overlay";
    var box = document.createElement("div");
    box.className = "admin-msg-box";
    var title = document.createElement("div");
    title.className = "admin-msg-title";
    title.textContent = "📣 Yöneticiden mesaj";
    var body = document.createElement("div");
    body.id = "adminMsgBody";
    var ok = document.createElement("button");
    ok.type = "button";
    ok.className = "save-btn";
    ok.textContent = "Tamam";
    ok.addEventListener("click", function () { ov.remove(); });
    box.appendChild(title);
    box.appendChild(body);
    box.appendChild(ok);
    ov.appendChild(box);
    document.body.appendChild(ov);
  }
  var p = document.createElement("p");
  p.className = "admin-msg-text";
  p.textContent = text;
  document.getElementById("adminMsgBody").appendChild(p);
}
function adminDurationText(secs) {
  var h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return (h ? h + " sa " : "") + (m ? m + " dk" : (h ? "" : "0 dk"));
}
function scheduleAdminSummarySync() {
  if (!currentUserUid) return;
  clearTimeout(adminSyncTimer);
  adminSyncTimer = setTimeout(function () {
    buildStudentSummaryPayload().then(function (payload) { syncStudentSummary(currentUserUid, payload); });
  }, 2000);
}
function doApplyAdminGrant(g) {
  if (!g || typeof g !== "object") return Promise.resolve(false);
  var note = typeof g.note === "string" ? g.note.slice(0, 80) : "";
  if (g.type === "coins") {
    var amt = Number(g.amount);
    if (!isFinite(amt) || amt === 0 || Math.abs(amt) > 100000) return Promise.resolve(false);
    amt = Math.round(amt * 10) / 10;
    // Depolamadan taze oku: şehir penceresi açıksa eski bellek kopyasının üzerine yazmayalım
    return loadCity().then(function (d) {
      d.coins = roundCoins(Math.max(0, (d.coins || 0) + amt));
      cityState = d;
      return saveCity();
    }).then(function () {
      try { renderCity(); } catch (e) {}
      showUpdateToast(amt > 0
        ? "🎁 Yönetici sana +" + amt + " altın ekledi" + (note ? ": " + note : "")
        : "Yönetici hesabından " + Math.abs(amt) + " altın düştü" + (note ? ": " + note : ""));
      return true;
    });
  }
  if (g.type === "study") {
    var secs = Math.floor(Number(g.seconds));
    var date = String(g.date || "");
    var subject = String(g.subject || "Genel").trim().slice(0, 40) || "Genel";
    if (!isFinite(secs) || secs <= 0 || secs > 86400 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > dateStr(new Date())) {
      return Promise.resolve(false);
    }
    var key = "study-" + date;
    return storageGet(key).then(function (value) {
      var rec = { subjects: {}, running: false, activeSubject: null, startTs: null };
      if (value) {
        try { var parsed = JSON.parse(value); if (parsed && typeof parsed === "object") rec = parsed; } catch (e) {}
      }
      if (!rec.subjects || typeof rec.subjects !== "object") rec.subjects = {};
      rec.subjects[subject] = (Number(rec.subjects[subject]) || 0) + secs;
      return storageSet(key, JSON.stringify(rec)).then(function () { return rec; });
    }).then(function (rec) {
      // bugünkü ders süreleri bellekte de tutulur; çalışan sayaç alanlarına dokunmadan sadece süreleri güncelle
      if (date === dateStr(new Date())) studyState.subjects = rec.subjects;
      try { renderStudy(); renderSubjectPie(true); } catch (e) {}
      showUpdateToast("🎁 Yönetici sana " + adminDurationText(secs) + " çalışma süresi ekledi (" + subject + ")" + (note ? ": " + note : ""));
      return true;
    });
  }
  if (g.type === "message") {
    var text = String(g.text || "").trim().slice(0, 300);
    if (!text) return Promise.resolve(false);
    showAdminMessage(text);
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
}
window.yksApplyAdminGrant = function (id, g) {
  adminGrantChain = adminGrantChain.then(function () {
    return storageGet(ADMIN_APPLIED_KEY).then(function (v) {
      var ids = [];
      try { var a = JSON.parse(v); if (Array.isArray(a)) ids = a; } catch (e) {}
      if (ids.indexOf(id) >= 0) return true;   // daha önce uygulanmış; yalnızca Firestore işaretlemesi eksikti
      return doApplyAdminGrant(g).then(function () {
        // geçersiz işlemler de "işlendi" sayılır ki sonsuza dek yeniden denenmesin
        ids.push(id);
        if (ids.length > 300) ids = ids.slice(-300);
        return storageSet(ADMIN_APPLIED_KEY, JSON.stringify(ids)).then(function () {
          scheduleAdminSummarySync();
          return true;
        });
      });
    });
  }).catch(function () { return false; });
  return adminGrantChain;
};
function buildStudentSummaryPayload() {
  var recs = (examState && examState.records) || [];
  var bestTYT = 0, bestAYT = 0;
  recs.forEach(function (r) {
    if (r.examKey === "TYT") bestTYT = Math.max(bestTYT, r.totalNet);
    else bestAYT = Math.max(bestAYT, r.totalNet);
  });
  var examRecordsPayload = recs.map(function (r) {
    return {
      id: r.id,
      date: r.date || "",
      examKey: r.examKey || "",
      name: r.name || "",
      totalNet: (typeof r.totalNet === "number") ? r.totalNet : 0,
      createdAt: r.createdAt || 0,
      subjects: r.subjects || {}
    };
  });

  return Promise.all([
    aggregateKeys(lastNDaysKeys(7)),
    aggregateKeys(lastNDaysKeys(30)),
    storageListKeys("study-").then(aggregateKeys),
    computeFocusStatsSummary()
  ]).then(function (results) {
    return {
      name: (currentUserProfile && currentUserProfile.name) || "",
      streak: (typeof streakDisplayedValue === "number") ? streakDisplayedValue : 0,
      cityCoins: (cityState && cityState.coins) || 0,
      cityBuildings: (cityState && cityState.buildings && ((typeof cityBuildingCount === "function") ? cityBuildingCount() : cityState.buildings.length)) || 0,
      cityPopulation: (typeof cityPopulation === "function") ? cityPopulation() : 0,
      examCount: recs.length,
      bestTYT: bestTYT,
      bestAYT: bestAYT,
      weeklySubjects: roundTotals(results[0]),
      monthlySubjects: roundTotals(results[1]),
      allSubjects: roundTotals(results[2]),
      examRecords: examRecordsPayload,
      focusStats: results[3],
      obp: (typeof state.obp === "number") ? state.obp : null
    };
  });
}
